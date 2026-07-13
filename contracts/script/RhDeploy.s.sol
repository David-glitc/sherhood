// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {PotCard} from "../src/PotCard.sol";
import {PotFactory} from "../src/PotFactory.sol";
import {RevealEngine} from "../src/RevealEngine.sol";
import {AssetManager} from "../src/AssetManager.sol";
import {Treasury} from "../src/Treasury.sol";
import {CardMarketplace} from "../src/CardMarketplace.sol";
import {EntryRouter} from "../src/EntryRouter.sol";
import {StockTokenRegistry} from "../src/StockTokenRegistry.sol";

/// @notice Deploy Sherhood pot stack to Robinhood Chain (4663).
/// Env: DEPLOYER_PRIVATE_KEY, USDG_ADDRESS, WETH_ADDRESS, SWAP_ROUTER, VRF_COORDINATOR
contract RhDeployScript is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        address usdg = vm.envAddress("USDG_ADDRESS");
        address weth = vm.envAddress("WETH_ADDRESS");
        address swapRouter = vm.envAddress("SWAP_ROUTER");
        address vrfCoordinator = vm.envAddress("VRF_COORDINATOR");

        vm.startBroadcast(pk);

        Treasury treasury = new Treasury(usdg, deployer);
        PotCard card = new PotCard(deployer);
        PotFactory factory = new PotFactory(deployer, usdg, address(card));
        RevealEngine reveal = new RevealEngine(deployer, address(card), vrfCoordinator);
        AssetManager assets = new AssetManager(deployer, usdg, swapRouter);
        StockTokenRegistry registry = new StockTokenRegistry(deployer);
        EntryRouter entry = new EntryRouter(deployer, usdg, weth, swapRouter, address(treasury), address(factory));
        CardMarketplace market = new CardMarketplace(deployer, address(card), usdg, address(treasury));

        card.setMinter(address(factory));
        card.setRevealer(address(reveal));
        factory.setAssetManager(address(assets));
        factory.setRevealEngine(address(reveal));
        factory.setTreasury(address(treasury));
        factory.setEntryRouter(address(entry));
        factory.setStockRegistry(address(registry));
        factory.setRequireRegisteredStock(true);
        factory.setCreationFee(vm.envOr("CREATION_FEE", uint256(10e18)));

        bytes32 keyHash = vm.envOr("VRF_KEY_HASH", bytes32(0));
        uint64 subId = uint64(vm.envOr("VRF_SUB_ID", uint256(0)));
        uint32 gasLimit = uint32(vm.envOr("VRF_CALLBACK_GAS", uint256(2_500_000)));
        if (keyHash != bytes32(0) && subId != 0) {
            reveal.setVRFConfig(keyHash, subId, gasLimit);
        }

        uint24 wethUsdgFee = uint24(vm.envOr("WETH_USDG_POOL_FEE", uint256(500)));
        entry.setWethUsdgPoolFee(wethUsdgFee);
        entry.setRouterFeeBps(vm.envOr("ROUTER_FEE_BPS", uint256(50)));

        vm.stopBroadcast();

        console.log("=== Sherhood RH deploy ===");
        console.log("USDG", usdg);
        console.log("WETH", weth);
        console.log("TREASURY", address(treasury));
        console.log("POT_CARD", address(card));
        console.log("POT_FACTORY", address(factory));
        console.log("REVEAL_ENGINE", address(reveal));
        console.log("ASSET_MANAGER", address(assets));
        console.log("ENTRY_ROUTER", address(entry));
        console.log("STOCK_REGISTRY", address(registry));
        console.log("MARKETPLACE", address(market));
        console.log("Deployer", deployer);
    }
}
