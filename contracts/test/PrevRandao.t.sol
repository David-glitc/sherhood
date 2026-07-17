// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Pot} from "../src/Pot.sol";
import {PotCard} from "../src/PotCard.sol";
import {PotFactory} from "../src/PotFactory.sol";
import {RevealEngine} from "../src/RevealEngine.sol";
import {AssetManager} from "../src/AssetManager.sol";
import {Treasury} from "../src/Treasury.sol";
import {PrevRandaoCoordinator} from "../src/PrevRandaoCoordinator.sol";
import {StockTokenRegistry} from "../src/StockTokenRegistry.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockSwapRouter} from "../src/mocks/MockSwapRouter.sol";

contract PrevRandaoTest is Test {
    MockERC20 usdg;
    MockERC20 nvda;
    MockSwapRouter router;
    PrevRandaoCoordinator entropy;

    Treasury treasury;
    PotCard card;
    PotFactory factory;
    RevealEngine reveal;
    AssetManager assets;
    StockTokenRegistry registry;

    address deployer = address(0xA11CE);
    address alice = address(0xB0B);
    address bob = address(0xC0C);

    function setUp() public {
        usdg = new MockERC20("USDG", "USDG", 18);
        nvda = new MockERC20("NVDA", "NVDA", 18);
        router = new MockSwapRouter();
        entropy = new PrevRandaoCoordinator(2, 64);

        vm.startPrank(deployer);
        treasury = new Treasury(address(usdg), deployer);
        card = new PotCard(deployer);
        factory = new PotFactory(deployer, address(usdg), address(card));
        reveal = new RevealEngine(deployer, address(card), address(entropy));
        assets = new AssetManager(deployer, address(usdg), address(router));
        registry = new StockTokenRegistry(deployer);
        card.setMinter(address(factory));
        card.setRevealer(address(reveal));
        factory.setAssetManager(address(assets));
        factory.setRevealEngine(address(reveal));
        factory.setTreasury(address(treasury));
        factory.setStockRegistry(address(registry));
        assets.setStockRegistry(address(registry));
        registry.setToken(address(nvda), true, "NVDA", 500);
        reveal.setVRFConfig(bytes32(uint256(1)), 1, 2_500_000);
        vm.stopPrank();

        usdg.mint(alice, 60_000e18);
        usdg.mint(bob, 60_000e18);
    }

    function test_prevRandao_reveal_conservation() public {
        vm.prank(deployer);
        address pot = factory.createPot(100_000e18, 7 days, 1e18, 0, 100);

        vm.startPrank(alice);
        usdg.approve(pot, type(uint256).max);
        Pot(pot).deposit(50_000e18);
        vm.stopPrank();

        vm.startPrank(bob);
        usdg.approve(pot, type(uint256).max);
        Pot(pot).deposit(50_000e18);
        vm.stopPrank();

        // Pot auto-closes when funding goal is met (no manual close()).

        vm.prank(deployer);
        assets.purchaseWithSeed(pot, 0xCAFE, 1, 0);
        Pot(pot).sweepFees();

        vm.prank(deployer);
        uint256 requestId = reveal.requestReveal(pot);

        vm.expectRevert("PrevRandao: too early");
        entropy.fulfill(requestId);

        vm.roll(block.number + 2);
        entropy.fulfill(requestId);

        assertEq(uint256(Pot(pot).status()), uint256(Pot.Status.Revealed));
        uint256[] memory ids = card.potTokenIds(pot);
        uint256 sum;
        for (uint256 i = 0; i < ids.length; i++) {
            sum += card.getCard(ids[i]).ownershipWeight;
            assertGt(card.getCard(ids[i]).ownershipWeight, 0);
        }
        assertEq(sum, 1e18);
    }
}
