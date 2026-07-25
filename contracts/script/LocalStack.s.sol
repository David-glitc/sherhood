// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {PotCard} from "../src/PotCard.sol";
import {PotFactory} from "../src/PotFactory.sol";
import {ProxyDeploy} from "./ProxyDeploy.sol";
import {RevealEngine} from "../src/RevealEngine.sol";
import {AssetManager} from "../src/AssetManager.sol";
import {Treasury} from "../src/Treasury.sol";
import {CardMarketplace} from "../src/CardMarketplace.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {StockTokenRegistry} from "../src/StockTokenRegistry.sol";
import {MockVRFCoordinator} from "../src/mocks/MockVRFCoordinator.sol";
import {MockSwapRouter} from "../src/mocks/MockSwapRouter.sol";

/// @notice Full local/devnet stack with mocks. Writes addresses to stdout for SimulateBusinessFlow.
contract LocalStackScript is Script {
    function run() external {
        // Prefer ANVIL_PRIVATE_KEY so contracts/.env DEPLOYER_PRIVATE_KEY cannot drain/fail local sim.
        uint256 pk = vm.envOr(
            "ANVIL_PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        MockERC20 usdg = new MockERC20("USDG", "USDG", 18);
        MockERC20 nvda = new MockERC20("NVDA", "NVDA", 18);
        MockVRFCoordinator vrf = new MockVRFCoordinator();
        MockSwapRouter router = new MockSwapRouter();

        Treasury treasury = new Treasury(address(usdg), deployer);
        PotCard card = new PotCard(deployer);
        PotFactory factory = ProxyDeploy.deployFactory(deployer, address(usdg), address(card));
        RevealEngine reveal = new RevealEngine(deployer, address(card), address(vrf));
        AssetManager assets = new AssetManager(deployer, address(usdg), address(router));
        StockTokenRegistry registry = new StockTokenRegistry(deployer);

        card.setMinter(address(factory));
        card.setRevealer(address(reveal));
        card.setBaseURI("http://localhost:3000/api/cards/");
        factory.setAssetManager(address(assets));
        factory.setRevealEngine(address(reveal));
        factory.setTreasury(address(treasury));
        factory.setStockRegistry(address(registry));
        assets.setStockRegistry(address(registry));
        registry.setToken(address(nvda), true, "NVDA", 500);
        factory.setCreationFee(5e18);
        reveal.setVRFConfig(bytes32("dev"), 1, 2_500_000);
        vrf.setConsumer(address(reveal));

        CardMarketplace market = new CardMarketplace(deployer, address(card), address(usdg), address(treasury));

        // Seed deployer + common anvil accounts
        usdg.mint(deployer, 1_000_000e18);
        address a1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        address a2 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
        address a3 = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
        usdg.mint(a1, 100_000e18);
        usdg.mint(a2, 100_000e18);
        usdg.mint(a3, 100_000e18);

        vm.stopBroadcast();

        console.log("USDG", address(usdg));
        console.log("NVDA", address(nvda));
        console.log("VRF", address(vrf));
        console.log("ROUTER", address(router));
        console.log("TREASURY", address(treasury));
        console.log("POT_CARD", address(card));
        console.log("POT_FACTORY", address(factory));
        console.log("REVEAL_ENGINE", address(reveal));
        console.log("ASSET_MANAGER", address(assets));
        console.log("MARKETPLACE", address(market));
    }
}
