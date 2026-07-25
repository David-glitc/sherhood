// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {MultiHopSwapAdapter} from "../src/MultiHopSwapAdapter.sol";
import {AssetManager} from "../src/AssetManager.sol";
import {StockTokenRegistry} from "../src/StockTokenRegistry.sol";
import {EntryRouter} from "../src/EntryRouter.sol";

/// @notice Deploy multi-hop adapter, point AssetManager at it, register liquid stocks, 2-pick default.
/// Env: DEPLOYER_PRIVATE_KEY, ASSET_MANAGER, ENTRY_ROUTER (optional), SWAP_ROUTER, USDG, WETH, UNISWAP_V3_FACTORY
contract RhMultiHopPurchaseScript is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address am = vm.envAddress("ASSET_MANAGER");
        address swapRouter = vm.envAddress("SWAP_ROUTER");
        address usdg = vm.envAddress("USDG");
        address weth = vm.envAddress("WETH");
        address v3Factory = vm.envAddress("UNISWAP_V3_FACTORY");
        address entry = vm.envOr("ENTRY_ROUTER", address(0));

        vm.startBroadcast(pk);
        address deployer = vm.addr(pk);

        MultiHopSwapAdapter adapter =
            new MultiHopSwapAdapter(deployer, swapRouter, usdg, weth, v3Factory);
        adapter.setUsdgWethFee(uint24(vm.envOr("USDG_WETH_FEE", uint256(100))));

        AssetManager(am).setSwapRouter(address(adapter));
        AssetManager(am).setPickBounds(2, 5, 2); // min 2, max 5, default 2 for small pots
        AssetManager(am).setSeededPurchaseEnabled(true);

        // Liquid-only registry: TSLA (via WETH@3000), USO (direct USDG@3000), COIN (direct USDG@3000)
        StockTokenRegistry reg = new StockTokenRegistry(deployer);
        address[] memory addrs = new address[](3);
        bool[] memory allowed = new bool[](3);
        string[] memory symbols = new string[](3);
        uint24[] memory fees = new uint24[](3);

        addrs[0] = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d; // TSLA
        addrs[1] = 0xa30FA36Db767ad9eD3f7a60fC79526fB4d56D344; // USO
        addrs[2] = 0x6330D8C3178a418788dF01a47479c0ce7CCF450b; // COIN
        for (uint256 i = 0; i < 3; i++) {
            allowed[i] = true;
            fees[i] = 3000;
        }
        symbols[0] = "TSLA";
        symbols[1] = "USO";
        symbols[2] = "COIN";
        reg.setTokens(addrs, allowed, symbols, fees);
        AssetManager(am).setStockRegistry(address(reg));

        if (entry != address(0)) {
            // WETH/USDG live pool is fee 100 on RH
            EntryRouter(payable(entry)).setWethUsdgPoolFee(100);
        }

        vm.stopBroadcast();

        console.log("MULTI_HOP_ADAPTER", address(adapter));
        console.log("STOCK_REGISTRY_LIQUID", address(reg));
        console.log("ASSET_MANAGER", am);
    }
}
