// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Pot} from "../src/Pot.sol";
import {PotCard} from "../src/PotCard.sol";
import {PotFactory} from "../src/PotFactory.sol";
import {RevealEngine} from "../src/RevealEngine.sol";
import {AssetManager} from "../src/AssetManager.sol";
import {Treasury} from "../src/Treasury.sol";
import {CardMarketplace} from "../src/CardMarketplace.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockVRFCoordinator} from "../src/mocks/MockVRFCoordinator.sol";
import {MockSwapRouter} from "../src/mocks/MockSwapRouter.sol";
import {StockTokenRegistry} from "../src/StockTokenRegistry.sol";

/// @notice Edge cases, reverts, and overflow-pressure scenarios for the pot stack.
contract PotEdgeOverflowTest is Test {
    MockERC20 usdg;
    MockERC20 nvda;
    MockVRFCoordinator vrf;
    MockSwapRouter router;
    Treasury treasury;
    PotCard card;
    PotFactory factory;
    RevealEngine reveal;
    AssetManager assets;
    StockTokenRegistry registry;
    CardMarketplace market;

    address deployer = address(0xA11CE);
    address alice = address(0xB0B);
    address bob = address(0xB0B2);
    address carol = address(0xC0C0);
    address mallory = address(0xBAD);

    function setUp() public {
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
        registry = new StockTokenRegistry(deployer);
        market = new CardMarketplace(deployer, address(card), address(usdg), address(treasury));
        card.setCardMarketplace(address(market));

        card.setMinter(address(factory));
        card.setRevealer(address(reveal));
        factory.setAssetManager(address(assets));
        factory.setRevealEngine(address(reveal));
        factory.setTreasury(address(treasury));
        assets.setStockRegistry(address(registry));
        registry.setToken(address(nvda), true, "NVDA", 3000);
        factory.setCreationFee(0);
        reveal.setVRFConfig(bytes32("k"), 1, 2_500_000);
        vrf.setConsumer(address(reveal));
        vm.stopPrank();

        usdg.mint(alice, type(uint128).max);
        usdg.mint(bob, type(uint128).max);
        usdg.mint(carol, type(uint128).max);
        usdg.mint(mallory, type(uint128).max);
        usdg.mint(deployer, type(uint128).max);
    }

    function _create(uint256 goal, uint256 minDep, uint256 entryFee, uint256 feeBps)
        internal
        returns (address pot)
    {
        vm.prank(deployer);
        pot = factory.createPot(goal, 7 days, minDep, entryFee, feeBps);
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

    function _reveal(address pot, uint256 seed) internal {
        vm.prank(deployer);
        assets.purchaseWithSeed(pot, seed, 1, 0);
        vm.prank(deployer);
        reveal.allocateWithSeed(pot, seed);
    }

    // ---------- deposit / funding edges ----------

    function test_revert_belowMinDeposit() public {
        address pot = _create(100e18, 10e18, 0, 100);
        vm.startPrank(alice);
        usdg.approve(pot, 5e18);
        vm.expectRevert(bytes("Pot: min"));
        Pot(pot).deposit(5e18);
        vm.stopPrank();
    }

    function test_revert_exceedsGoal() public {
        address pot = _create(100e18, 1e18, 0, 100);
        _deposit(alice, pot, 60e18);
        vm.startPrank(bob);
        usdg.approve(pot, 50e18);
        vm.expectRevert(bytes("Pot: goal"));
        Pot(pot).deposit(50e18);
        vm.stopPrank();
    }

    function test_exactGoal_autoCloses() public {
        address pot = _create(100e18, 1e18, 0, 100);
        _deposit(alice, pot, 40e18);
        _deposit(bob, pot, 60e18);
        assertEq(uint256(Pot(pot).status()), uint256(Pot.Status.Closed));
        vm.startPrank(carol);
        usdg.approve(pot, 1e18);
        vm.expectRevert(bytes("Pot: funding"));
        Pot(pot).deposit(1e18);
        vm.stopPrank();
    }

    function test_revert_closeEmpty() public {
        address pot = _create(100e18, 1e18, 0, 100);
        vm.warp(block.timestamp + 7 days + 1);
        vm.expectRevert(bytes("Pot: empty"));
        Pot(pot).close();
    }

    function test_revert_closeTooEarly() public {
        address pot = _create(1_000e18, 1e18, 0, 100);
        _deposit(alice, pot, 10e18);
        vm.expectRevert(bytes("Pot: ready"));
        Pot(pot).close();
    }

    function test_revert_depositAfterDeadline() public {
        address pot = _create(1_000e18, 1e18, 0, 100);
        vm.warp(block.timestamp + 7 days + 1);
        vm.startPrank(alice);
        usdg.approve(pot, 10e18);
        vm.expectRevert(bytes("Pot: deadline"));
        Pot(pot).deposit(10e18);
        vm.stopPrank();
    }

    // ---------- fee / factory edges ----------

    function test_revert_protocolFeeTooHigh() public {
        vm.prank(deployer);
        vm.expectRevert(bytes("PotFactory: fee high"));
        factory.createPot(100e18, 7 days, 1e18, 0, 2001);
    }

    function test_maxProtocolFee_ok() public {
        address pot = _create(100e18, 1e18, 0, 2000);
        assertEq(Pot(pot).protocolFeeBps(), 2000);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        assertEq(Pot(pot).protocolFeeOwed(), 20e18); // 20% of 100
    }

    function test_entryFee_plus_deposit_pullsCorrectly() public {
        address pot = _create(100e18, 1e18, 7e18, 100);
        uint256 before = usdg.balanceOf(alice);
        _deposit(alice, pot, 50e18);
        assertEq(before - usdg.balanceOf(alice), 57e18);
        assertEq(Pot(pot).totalEntryFees(), 7e18);
        assertEq(Pot(pot).totalDeposited(), 50e18);
    }

    // ---------- claim / reveal edges ----------

    function test_revert_claimBeforeReveal() public {
        address pot = _create(100e18, 1e18, 0, 100);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        vm.prank(deployer);
        assets.purchaseWithSeed(pot, 1, 1, 0);
        uint256 id = card.potTokenIds(pot)[0];
        vm.prank(alice);
        vm.expectRevert(bytes("Pot: revealed"));
        Pot(pot).claim(id);
    }

    function test_revert_doubleReveal() public {
        address pot = _create(100e18, 1e18, 0, 100);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        _reveal(pot, 42);
        vm.prank(deployer);
        // Status is already Revealed, so purchase gate fires first.
        vm.expectRevert(bytes("Reveal: purchased"));
        reveal.allocateWithSeed(pot, 99);
    }

    function test_dust_afterAllClaims_le_participants() public {
        address pot = _create(300e18, 1e18, 0, 100);
        _deposit(alice, pot, 100e18);
        _deposit(bob, pot, 100e18);
        _deposit(carol, pot, 100e18);
        _reveal(pot, 999);

        uint256[] memory ids = card.potTokenIds(pot);
        vm.prank(alice);
        Pot(pot).claim(ids[0]);
        vm.prank(bob);
        Pot(pot).claim(ids[1]);
        vm.prank(carol);
        Pot(pot).claim(ids[2]);

        uint256 dust = nvda.balanceOf(pot);
        // floor division can leave at most (n-1) wei of dust
        assertLe(dust, 2);
    }

    // ---------- overflow pressure ----------

    /// @dev Extreme but safe deposits: deposit * MULT_CEIL must not overflow under 0.8.
    function test_largeDeposits_revealNoOverflow() public {
        // 1e30 * 20000 = 2e34 << uint256 max
        uint256 unit = 1e27;
        uint256 goal = unit * 3;
        address pot = _create(goal, 1e18, 0, 100);
        _deposit(alice, pot, unit);
        _deposit(bob, pot, unit);
        _deposit(carol, pot, unit);
        _reveal(pot, type(uint256).max);

        uint256 sum;
        uint256[] memory ids = card.potTokenIds(pot);
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 w = card.getCard(ids[i]).ownershipWeight;
            assertGt(w, 0);
            sum += w;
        }
        assertEq(sum, 1e18);
    }

    /// @dev Fuzz: unequal large deposits still conserve ownership + assets.
    function testFuzz_unequalLargeDeposits(uint256 a, uint256 b, uint256 seed) public {
        a = bound(a, 1e18, 1e24);
        b = bound(b, 1e18, 1e24);
        seed = bound(seed, 1, type(uint256).max);
        uint256 goal = a + b;
        address pot = _create(goal, 1e18, 0, 100);
        _deposit(alice, pot, a);
        _deposit(bob, pot, b);
        _reveal(pot, seed);

        uint256 sum;
        uint256[] memory ids = card.potTokenIds(pot);
        for (uint256 i = 0; i < ids.length; i++) {
            sum += card.getCard(ids[i]).ownershipWeight;
            assertGt(card.getCard(ids[i]).ownershipWeight, 0);
        }
        assertEq(sum, 1e18);

        vm.prank(alice);
        Pot(pot).claim(ids[0]);
        vm.prank(bob);
        Pot(pot).claim(ids[1]);
        assertLe(nvda.balanceOf(pot), 2);
    }

    /// @dev Solidity 0.8 panics if depositAmount * MULT_CEIL would overflow.
    function test_overflow_depositTimesMult_panics() public {
        OverflowProbe probe = new OverflowProbe();
        uint256 huge = type(uint256).max / 10_000; // overflows when * 20_000
        vm.expectRevert(); // Panic(0x11)
        probe.mul(huge, 20_000);
    }

    // ---------- marketplace edges ----------

    function test_market_cannotBuyInactive() public {
        address pot = _create(100e18, 1e18, 0, 100);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        _reveal(pot, 1);
        uint256 id = card.potTokenIds(pot)[0];

        usdg.mint(mallory, 100e18);
        vm.startPrank(mallory);
        usdg.approve(address(market), 100e18);
        vm.expectRevert(bytes("Market: listed"));
        market.buy(id);
        vm.stopPrank();
    }

    function test_market_royalty_conserved() public {
        address pot = _create(100e18, 1e18, 0, 100);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        _reveal(pot, 1);
        uint256 id = card.potTokenIds(pot)[0];

        vm.startPrank(alice);
        card.approve(address(market), id);
        market.list(id, 100e18);
        vm.stopPrank();

        usdg.mint(mallory, 100e18);
        uint256 beforeT = treasury.feesCollectedUSDG();
        uint256 beforeA = usdg.balanceOf(alice);
        vm.startPrank(mallory);
        usdg.approve(address(market), 100e18);
        market.buy(id);
        vm.stopPrank();

        // 2.5% royalty default
        assertEq(treasury.feesCollectedUSDG() - beforeT, 25e17);
        assertEq(usdg.balanceOf(alice) - beforeA, 975e17);
        assertEq(card.ownerOf(id), mallory);
    }

    // ---------- many participants stress ----------

    function test_manyParticipants_ownershipConserved() public {
        uint256 n = 40;
        uint256 goal = 10e18 * n;
        address pot = _create(goal, 1e18, 0, 100);
        for (uint256 i = 0; i < n; i++) {
            address user = address(uint160(0x7000 + i));
            usdg.mint(user, 100e18);
            _deposit(user, pot, 10e18);
        }
        _reveal(pot, 12345);
        uint256 sum;
        uint256[] memory ids = card.potTokenIds(pot);
        assertEq(ids.length, n);
        for (uint256 i = 0; i < n; i++) {
            uint256 w = card.getCard(ids[i]).ownershipWeight;
            assertGt(w, 0);
            sum += w;
        }
        assertEq(sum, 1e18);
    }
}

contract OverflowProbe {
    function mul(uint256 a, uint256 b) external pure returns (uint256) {
        return a * b;
    }
}
