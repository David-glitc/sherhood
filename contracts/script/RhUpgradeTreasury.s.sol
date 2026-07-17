// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {TreasuryDirect} from "../src/TreasuryDirect.sol";
import {PotFactory} from "../src/PotFactory.sol";
import {EntryRouter} from "../src/EntryRouter.sol";
import {CardMarketplace} from "../src/CardMarketplace.sol";

/// @notice Point fee sinks at TreasuryDirect (forwards to TREASURY_FEE_WALLET).
/// Factory / EntryRouter / Marketplace addresses stay the same — only treasury pointer changes.
contract RhUpgradeTreasuryScript is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        address usdg = vm.envAddress("USDG_ADDRESS");
        address feeWallet = vm.envAddress("TREASURY_FEE_WALLET");
        address factory = vm.envAddress("POT_FACTORY_ADDRESS");
        address entry = vm.envAddress("ENTRY_ROUTER_ADDRESS");
        address market = vm.envAddress("MARKETPLACE_ADDRESS");

        vm.startBroadcast(pk);

        TreasuryDirect treasury = new TreasuryDirect(usdg, feeWallet, deployer);

        PotFactory(factory).setTreasury(address(treasury));
        EntryRouter(payable(entry)).setTreasury(address(treasury));
        CardMarketplace(market).setTreasury(address(treasury));

        vm.stopBroadcast();

        console.log("=== Treasury upgrade (protocol addresses unchanged) ===");
        console.log("TREASURY_DIRECT", address(treasury));
        console.log("FEE_WALLET", feeWallet);
        console.log("POT_FACTORY", factory);
        console.log("ENTRY_ROUTER", entry);
        console.log("MARKETPLACE", market);
    }
}
