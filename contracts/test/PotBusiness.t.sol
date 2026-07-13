// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pot} from "../src/Pot.sol";
import {PotCard} from "../src/PotCard.sol";
import {PotFactory} from "../src/PotFactory.sol";
import {RevealEngine} from "../src/RevealEngine.sol";
import {AssetManager} from "../src/AssetManager.sol";
import {Treasury} from "../src/Treasury.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockVRFCoordinator} from "../src/mocks/MockVRFCoordinator.sol";
import {MockSwapRouter} from "../src/mocks/MockSwapRouter.sol";

contract PotHarness is Test {
    MockERC20 internal usdg;
    MockERC20 internal nvda;
    MockVRFCoordinator internal vrf;
    MockSwapRouter internal router;
    Treasury internal treasury;
    PotCard internal card;
    PotFactory internal factory;
    RevealEngine internal reveal;
    AssetManager internal assets;

    address internal deployer = address(0xA11CE);
    address internal alice = address(0xB0B);
    address internal bob = address(0xB0B2);
    address internal carol = address(0xC0C0);

    function _setUpStack() internal {
        vm.startPrank(deployer);
        usdg = new MockERC20("USDG", "USDG", 18);
        nvda = new MockERC20("NVDA", "NVDA", 18);
        vrf = new MockVRFCoordinator();
        router = new MockSwapRouter();
        treasury = new Treasury(address(usdg), deployer);
        card = new PotCard(deployer);
        factory = new PotFactory(deployer, address(usdg), address(card));
        reveal = new RevealEngine(deployer, address(card), address(vrf));
        assets = new AssetManager(deployer, address(usdg), address(router));

        card.setMinter(address(factory));
        card.setRevealer(address(reveal));
        factory.setAssetManager(address(assets));
        factory.setRevealEngine(address(reveal));
        factory.setTreasury(address(treasury));
        factory.setCreationFee(10e18);
        factory.setRequireRegisteredStock(false);
        reveal.setVRFConfig(bytes32("key"), 1, 2_500_000);
        vrf.setConsumer(address(reveal));
        vm.stopPrank();

        usdg.mint(alice, 1_000_000e18);
        usdg.mint(bob, 1_000_000e18);
        usdg.mint(carol, 1_000_000e18);
        usdg.mint(deployer, 1_000_000e18);
    }

    function _createPlatformPot(uint256 goal, uint256 duration, uint256 minDeposit, uint256 entryFee)
        internal
        returns (address pot)
    {
        vm.prank(deployer);
        pot = factory.createPot(address(nvda), 3000, goal, duration, minDeposit, entryFee, 100);
    }

    function _deposit(address user, address pot, uint256 amount) internal {
        uint256 fee = Pot(pot).entryFee();
        vm.startPrank(user);
        usdg.approve(pot, amount + fee);
        Pot(pot).deposit(amount);
        vm.stopPrank();
    }

    function _runToRevealed(address pot, uint256 seed) internal {
        vm.prank(deployer);
        assets.purchase(pot, 0);
        vm.prank(deployer);
        reveal.allocateWithSeed(pot, seed);
    }
}

contract PotProtocolTest is PotHarness {
    function setUp() public {
        _setUpStack();
    }

    function test_fundingClosePurchaseReveal_conservation() public {
        address pot = _createPlatformPot(300e18, 7 days, 50e18, 0);
        _deposit(alice, pot, 100e18);
        _deposit(bob, pot, 100e18);
        _deposit(carol, pot, 100e18);

        assertEq(uint256(Pot(pot).status()), uint256(Pot.Status.Closed));
        _runToRevealed(pot, 42);

        uint256 total;
        uint256[] memory ids = card.potTokenIds(pot);
        for (uint256 i = 0; i < ids.length; i++) {
            PotCard.CardData memory c = card.getCard(ids[i]);
            assertTrue(c.revealed);
            assertGt(c.ownershipWeight, 0);
            total += c.ownershipWeight;
        }
        assertEq(total, 1e18);
    }

    function test_closeOnDeadline() public {
        address pot = _createPlatformPot(1_000_000e18, 1 days, 10e18, 1e18);
        _deposit(alice, pot, 50e18);
        vm.warp(block.timestamp + 1 days + 1);
        Pot(pot).close();
        assertEq(uint256(Pot(pot).status()), uint256(Pot.Status.Closed));
    }
}

contract BusinessFlowTest is PotHarness {
    function setUp() public {
        _setUpStack();
    }

    function test_fullFlow_fees_and_claims() public {
        address pot = _createPlatformPot(300e18, 7 days, 50e18, 5e18);
        _deposit(alice, pot, 100e18);
        _deposit(bob, pot, 100e18);
        _deposit(carol, pot, 100e18);

        // entry fees = 3 * 5 = 15; protocol 1% of 300 = 3; total fees 18
        assertEq(Pot(pot).totalEntryFees(), 15e18);
        assertEq(Pot(pot).protocolFeeOwed(), 3e18);

        vm.prank(deployer);
        assets.purchase(pot, 0);
        Pot(pot).sweepFees();
        assertEq(treasury.feesCollectedUSDG(), 18e18);

        vm.prank(deployer);
        reveal.allocateWithSeed(pot, 123);

        uint256[] memory ids = card.potTokenIds(pot);
        uint256 beforeA = nvda.balanceOf(alice);
        vm.prank(alice);
        uint256 payout = Pot(pot).claim(ids[0]);
        assertGt(payout, 0);
        assertEq(nvda.balanceOf(alice), beforeA + payout);

        vm.prank(bob);
        Pot(pot).claim(ids[1]);
        vm.prank(carol);
        Pot(pot).claim(ids[2]);

        assertEq(Pot(pot).claimCount(), 3);
        assertEq(Pot(pot).assetsClaimed() + nvda.balanceOf(pot), Pot(pot).assetAmount());
    }

    function test_communityPot_pays_creation_fee() public {
        uint256 before = treasury.feesCollectedUSDG();
        vm.startPrank(alice);
        usdg.approve(address(factory), 10e18);
        address pot = factory.createCommunityPot(address(nvda), 3000, 100e18, 7 days, 10e18, 0, 100);
        vm.stopPrank();
        assertTrue(factory.isPot(pot));
        assertEq(factory.potCreator(pot), alice);
        assertEq(treasury.feesCollectedUSDG(), before + 10e18);
    }

    function test_doubleClaim_reverts() public {
        address pot = _createPlatformPot(100e18, 7 days, 50e18, 0);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        _runToRevealed(pot, 7);
        uint256 id = card.potTokenIds(pot)[0];
        vm.prank(alice);
        Pot(pot).claim(id);
        vm.prank(alice);
        vm.expectRevert(bytes("Pot: claimed"));
        Pot(pot).claim(id);
    }

    function test_claimWrongOwner_reverts() public {
        address pot = _createPlatformPot(100e18, 7 days, 50e18, 0);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        _runToRevealed(pot, 7);
        uint256 id = card.potTokenIds(pot)[0];
        vm.prank(bob);
        vm.expectRevert(bytes("Pot: not owner"));
        Pot(pot).claim(id);
    }

    function test_pause_blocks_deposit() public {
        address pot = _createPlatformPot(1_000e18, 7 days, 10e18, 0);
        vm.prank(deployer);
        factory.pause();
        vm.startPrank(alice);
        usdg.approve(pot, 100e18);
        vm.expectRevert(bytes("Pot: factory paused"));
        Pot(pot).deposit(100e18);
        vm.stopPrank();
    }

    function test_doublePull_reverts() public {
        address pot = _createPlatformPot(100e18, 7 days, 50e18, 0);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        vm.prank(deployer);
        assets.purchase(pot, 0);
        vm.prank(address(assets));
        vm.expectRevert(bytes("Pot: not closed"));
        Pot(pot).pullForPurchase();
    }
}

contract PotAttackTest is PotHarness {
    function setUp() public {
        _setUpStack();
    }

    function test_cannotSweepFeesTwice() public {
        address pot = _createPlatformPot(100e18, 7 days, 50e18, 5e18);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        vm.prank(deployer);
        assets.purchase(pot, 0);
        Pot(pot).sweepFees();
        vm.expectRevert(bytes("Pot: nothing to sweep"));
        Pot(pot).sweepFees();
    }

    function test_strangerCannotMarkClaimed() public {
        address pot = _createPlatformPot(100e18, 7 days, 50e18, 0);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        _runToRevealed(pot, 1);
        uint256 id = card.potTokenIds(pot)[0];
        vm.prank(alice);
        vm.expectRevert(bytes("PotCard: only pot"));
        card.markClaimed(id);
    }

    function test_strangerCannotMint() public {
        vm.prank(alice);
        vm.expectRevert(bytes("PotFactory: only pot"));
        factory.mintCard(alice, 1e18);
    }

    function test_revealBeforePurchase_reverts() public {
        address pot = _createPlatformPot(100e18, 7 days, 50e18, 0);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        vm.prank(deployer);
        vm.expectRevert(bytes("RevealEngine: not purchased"));
        reveal.allocateWithSeed(pot, 1);
    }
}

contract PotFuzzTest is PotHarness {
    function setUp() public {
        _setUpStack();
    }

    function testFuzz_revealAlwaysSumsToOne(uint256 seed, uint8 nRaw) public {
        uint256 n = bound(nRaw, 2, 20);
        seed = bound(seed, 1, type(uint256).max);

        uint256 goal = 100e18 * n;
        address pot = _createPlatformPot(goal, 30 days, 1e18, 0);

        for (uint256 i = 0; i < n; i++) {
            address user = address(uint160(0x5000 + i));
            usdg.mint(user, 1_000e18);
            _deposit(user, pot, 100e18);
        }

        _runToRevealed(pot, seed);

        uint256 total;
        uint256[] memory ids = card.potTokenIds(pot);
        assertEq(ids.length, n);
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 w = card.getCard(ids[i]).ownershipWeight;
            assertGt(w, 0);
            total += w;
        }
        assertEq(total, 1e18);
    }

    function testFuzz_claimsConserveAssets(uint256 seed) public {
        seed = bound(seed, 1, type(uint256).max);
        address pot = _createPlatformPot(500e18, 7 days, 10e18, 0);
        address[5] memory users = [alice, bob, carol, address(0xD0D0), address(0xE0E0)];
        for (uint256 i = 0; i < 5; i++) {
            usdg.mint(users[i], 200e18);
            _deposit(users[i], pot, 100e18);
        }
        _runToRevealed(pot, seed);

        uint256[] memory ids = card.potTokenIds(pot);
        uint256 claimed;
        for (uint256 i = 0; i < ids.length; i++) {
            address owner_ = card.ownerOf(ids[i]);
            vm.prank(owner_);
            claimed += Pot(pot).claim(ids[i]);
        }
        assertEq(claimed, Pot(pot).assetsClaimed());
        assertLe(claimed, Pot(pot).assetAmount());
        assertEq(claimed + nvda.balanceOf(pot), Pot(pot).assetAmount());
    }
}
