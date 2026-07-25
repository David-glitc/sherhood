// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pot} from "../src/Pot.sol";
import {PotCard} from "../src/PotCard.sol";
import {PotFactory} from "../src/PotFactory.sol";
import {DeployFactory} from "./DeployFactory.sol";
import {RevealEngine} from "../src/RevealEngine.sol";
import {AssetManager} from "../src/AssetManager.sol";
import {Treasury} from "../src/Treasury.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockVRFCoordinator} from "../src/mocks/MockVRFCoordinator.sol";
import {MockSwapRouter} from "../src/mocks/MockSwapRouter.sol";
import {StockTokenRegistry} from "../src/StockTokenRegistry.sol";
import {SherhoodToken} from "../src/SherhoodToken.sol";

contract PotHarness is Test {
    MockERC20 internal usdg;
    MockERC20 internal nvda;
    MockERC20 internal aapl;
    MockVRFCoordinator internal vrf;
    MockSwapRouter internal router;
    Treasury internal treasury;
    PotCard internal card;
    PotFactory internal factory;
    RevealEngine internal reveal;
    AssetManager internal assets;
    StockTokenRegistry internal registry;
    SherhoodToken internal shrh;

    address internal deployer = address(0xA11CE);
    address internal alice = address(0xB0B);
    address internal bob = address(0xB0B2);
    address internal carol = address(0xC0C0);

    function _setUpStack() internal {
        vm.startPrank(deployer);
        usdg = new MockERC20("USDG", "USDG", 18);
        nvda = new MockERC20("NVDA", "NVDA", 18);
        aapl = new MockERC20("AAPL", "AAPL", 18);
        vrf = new MockVRFCoordinator();
        router = new MockSwapRouter();
        treasury = new Treasury(address(usdg), deployer);
        card = new PotCard(deployer);
        factory = DeployFactory.deploy(deployer, address(usdg), address(card));
        reveal = new RevealEngine(deployer, address(card), address(vrf));
        assets = new AssetManager(deployer, address(usdg), address(router));
        registry = new StockTokenRegistry(deployer);
        shrh = new SherhoodToken(deployer, deployer);

        card.setMinter(address(factory));
        card.setRevealer(address(reveal));
        factory.setAssetManager(address(assets));
        factory.setRevealEngine(address(reveal));
        factory.setTreasury(address(treasury));
        factory.setStockRegistry(address(registry));
        assets.setStockRegistry(address(registry));
        registry.setToken(address(nvda), true, "NVDA", 3000);
        registry.setToken(address(aapl), true, "AAPL", 3000);
        factory.setCreationFee(5e18);
        reveal.setVRFConfig(bytes32("key"), 1, 2_500_000);
        reveal.setLuckToken(address(shrh), 1000e18, 2500);
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
        pot = factory.createPot(goal, duration, minDeposit, entryFee, 100);
    }

    function _holdingTotal(address pot) internal view returns (uint256 total) {
        uint256 n = Pot(pot).holdingsCount();
        for (uint256 i = 0; i < n; i++) {
            (, uint256 amt) = Pot(pot).holdingAt(i);
            total += amt;
        }
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
        assets.purchaseWithSeed(pot, seed, 1, 0);
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
        // Under-funded close is an operator/creator decision (deployer created this pot).
        vm.prank(deployer);
        Pot(pot).close();
        assertEq(uint256(Pot(pot).status()), uint256(Pot.Status.Closed));
    }

    function test_revert_underfundedClose_thirdParty() public {
        address pot = _createPlatformPot(1_000_000e18, 1 days, 10e18, 1e18);
        _deposit(alice, pot, 50e18);
        vm.warp(block.timestamp + 1 days + 1);
        // A third party cannot force an under-funded pot forward and strip refunds.
        vm.prank(bob);
        vm.expectRevert(bytes("Pot: auth"));
        Pot(pot).close();
        // But cancel() (refund path) remains open to anyone.
        vm.prank(bob);
        Pot(pot).cancel();
        assertEq(uint256(Pot(pot).status()), uint256(Pot.Status.Cancelled));
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
        assets.purchaseWithSeed(pot, 999, 1, 0);
        // Default creator share is 30%: treasury gets 70% of the 18 in fees, creator gets 30%.
        uint256 treasuryBefore = treasury.feesCollectedUSDG();
        uint256 creatorBefore = usdg.balanceOf(Pot(pot).creator());
        Pot(pot).sweepFees();
        assertEq(treasury.feesCollectedUSDG() - treasuryBefore, 12_600e15); // 70% of 18e18
        assertEq(Pot(pot).creatorFeesPaid(), 5_400e15); // 30% of 18e18
        assertEq(usdg.balanceOf(Pot(pot).creator()) - creatorBefore, 5_400e15);

        vm.prank(deployer);
        reveal.allocateWithSeed(pot, 123);

        uint256[] memory ids = card.potTokenIds(pot);
        uint256 beforeA = nvda.balanceOf(alice);
        vm.prank(alice);
        uint256[] memory payoutA = Pot(pot).claim(ids[0]);
        assertGt(payoutA[0], 0);
        assertEq(nvda.balanceOf(alice), beforeA + payoutA[0]);

        vm.prank(bob);
        Pot(pot).claim(ids[1]);
        vm.prank(carol);
        Pot(pot).claim(ids[2]);

        assertEq(Pot(pot).claimCount(), 3);
        assertLe(nvda.balanceOf(pot), 2);
    }

    function test_creatorSplit_campaignRate_lockedAtCreation() public {
        // Launch campaign: creators get 50%.
        vm.prank(deployer);
        factory.setCreatorFeeShareBps(5000);

        address pot = _createPlatformPot(300e18, 7 days, 50e18, 5e18);
        assertEq(Pot(pot).creatorFeeShareBps(), 5000);

        // Campaign ends and the rate drops — the already-created pool keeps its 50%.
        vm.prank(deployer);
        factory.setCreatorFeeShareBps(3000);
        assertEq(Pot(pot).creatorFeeShareBps(), 5000);

        _deposit(alice, pot, 100e18);
        _deposit(bob, pot, 100e18);
        _deposit(carol, pot, 100e18);

        // fees = 15 entry + 3 protocol = 18; 50/50 split.
        vm.prank(deployer);
        assets.purchaseWithSeed(pot, 1, 1, 0);
        uint256 tBefore = treasury.feesCollectedUSDG();
        Pot(pot).sweepFees();
        assertEq(Pot(pot).creatorFeesPaid(), 9e18);
        assertEq(treasury.feesCollectedUSDG() - tBefore, 9e18);
    }

    function test_setCreatorFeeShareBps_capEnforced() public {
        vm.prank(deployer);
        vm.expectRevert("PotFactory: creator share high");
        factory.setCreatorFeeShareBps(5001);
    }

    function test_communityPot_pays_creation_fee() public {
        uint256 before = treasury.feesCollectedUSDG();
        vm.startPrank(alice);
        usdg.approve(address(factory), 5e18);
        address pot = factory.createCommunityPot(100e18, 7 days, 10e18, 0, 100);
        vm.stopPrank();
        assertTrue(factory.isPot(pot));
        assertEq(factory.potCreator(pot), alice);
        assertEq(treasury.feesCollectedUSDG(), before + 5e18);
    }

    function test_owner_createCommunityPot_no_fee() public {
        uint256 before = treasury.feesCollectedUSDG();
        vm.prank(deployer);
        address pot = factory.createCommunityPot(100e18, 7 days, 10e18, 0, 100);
        assertTrue(factory.isPot(pot));
        assertEq(factory.potCreator(pot), deployer);
        assertEq(treasury.feesCollectedUSDG(), before);
    }

    function test_doubleClaim_reverts() public {
        address pot = _createPlatformPot(100e18, 7 days, 50e18, 0);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        _runToRevealed(pot, 7);
        uint256 id = card.potTokenIds(pot)[0];
        vm.prank(alice);
        Pot(pot).claim(id);
        // Card is burned on claim — second claim hits nonexistent token.
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("ERC721NonexistentToken(uint256)", id));
        Pot(pot).claim(id);
    }

    function test_claimWrongOwner_reverts() public {
        address pot = _createPlatformPot(100e18, 7 days, 50e18, 0);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        _runToRevealed(pot, 7);
        uint256 id = card.potTokenIds(pot)[0];
        vm.prank(bob);
        vm.expectRevert(bytes("Pot: owner"));
        Pot(pot).claim(id);
    }

    function test_pause_blocks_deposit() public {
        address pot = _createPlatformPot(1_000e18, 7 days, 10e18, 0);
        vm.prank(deployer);
        factory.pause();
        vm.startPrank(alice);
        usdg.approve(pot, 100e18);
        vm.expectRevert(bytes("Pot: paused"));
        Pot(pot).deposit(100e18);
        vm.stopPrank();
    }

    function test_doublePull_reverts() public {
        address pot = _createPlatformPot(100e18, 7 days, 50e18, 0);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        vm.prank(deployer);
        assets.purchaseWithSeed(pot, 1, 1, 0);
        vm.prank(address(assets));
        vm.expectRevert(bytes("Pot: closed"));
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
        assets.purchaseWithSeed(pot, 2, 1, 0);
        Pot(pot).sweepFees();
        vm.expectRevert(bytes("Pot: fees"));
        Pot(pot).sweepFees();
    }

    function test_strangerCannotMarkClaimed() public {
        address pot = _createPlatformPot(100e18, 7 days, 50e18, 0);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        _runToRevealed(pot, 1);
        uint256 id = card.potTokenIds(pot)[0];
        vm.prank(alice);
        vm.expectRevert(bytes("Card: pot"));
        card.burnForClaim(id);
    }

    function test_strangerCannotMint() public {
        vm.prank(alice);
        vm.expectRevert(bytes("PotFactory: only pot"));
        factory.mintCard(alice, 1e18);
    }

    function test_protocolStats_counters() public {
        assertEq(factory.depositCount(), 0);
        assertEq(factory.uniqueDepositors(), 0);
        assertEq(card.totalMinted(), 0);

        address potA = _createPlatformPot(100e18, 7 days, 50e18, 0);
        _deposit(alice, potA, 50e18);
        _deposit(bob, potA, 50e18);

        address potB = _createPlatformPot(200e18, 7 days, 50e18, 0);
        _deposit(alice, potB, 100e18);

        (uint256 pools, uint256 volume, uint256 deposits, uint256 users) = factory.protocolStats();
        assertEq(pools, 2);
        assertEq(volume, 200e18);
        assertEq(deposits, 3);
        assertEq(users, 2); // alice counted once across pots

        assertEq(card.totalMinted(), 3);
        assertEq(card.totalSupply(), 3);
        assertEq(card.totalBurned(), 0);

        // Early exit burns and decrements supply, not minted.
        uint256 aliceCardB = card.potTokenIds(potB)[0];
        vm.prank(alice);
        Pot(potB).earlyExit(aliceCardB);
        assertEq(card.totalBurned(), 1);
        assertEq(card.totalSupply(), 2);

        // Claim also burns.
        _runToRevealed(potA, 42);
        uint256[] memory ids = card.potTokenIds(potA);
        vm.prank(card.ownerOf(ids[0]));
        Pot(potA).claim(ids[0]);
        assertEq(card.totalBurned(), 2);
        assertEq(card.totalSupply(), 1);
        assertEq(card.totalMinted(), 3);

        // Volume is cumulative gross — unchanged by exits/claims.
        assertEq(factory.totalDepositVolume(), 200e18);
    }

    function test_revealBeforePurchase_reverts() public {
        address pot = _createPlatformPot(100e18, 7 days, 50e18, 0);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        vm.prank(deployer);
        vm.expectRevert(bytes("Reveal: purchased"));
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
            uint256[] memory payouts = Pot(pot).claim(ids[i]);
            for (uint256 j = 0; j < payouts.length; j++) {
                claimed += payouts[j];
            }
        }
        assertLe(claimed, _holdingTotal(pot));
        assertLe(nvda.balanceOf(pot) + aapl.balanceOf(pot), 10);
    }

    function test_multiStockPurchase() public {
        address pot = _createPlatformPot(200e18, 7 days, 50e18, 0);
        _deposit(alice, pot, 100e18);
        _deposit(bob, pot, 100e18);

        vm.prank(deployer);
        assets.purchaseWithSeed(pot, 0xBEEF, 2, 0);
        assertEq(Pot(pot).holdingsCount(), 2);

        (address t0,) = Pot(pot).holdingAt(0);
        (address t1,) = Pot(pot).holdingAt(1);
        assertTrue(t0 == address(nvda) || t0 == address(aapl));
        assertTrue(t1 == address(nvda) || t1 == address(aapl));
        assertTrue(t0 != t1);
    }
}
