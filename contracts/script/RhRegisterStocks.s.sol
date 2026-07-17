// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {StockTokenRegistry} from "../src/StockTokenRegistry.sol";

/// @notice Register canonical RH stock tokens on StockTokenRegistry after deploy.
/// Env: STOCK_REGISTRY, STOCK_SYMBOLS (comma), STOCK_ADDRESSES (comma), STOCK_FEES (comma uint24, default 500)
contract RhRegisterStocksScript is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address registryAddr = vm.envAddress("STOCK_REGISTRY");

        string memory symCsv = vm.envString("STOCK_SYMBOLS");
        string memory addrCsv = vm.envString("STOCK_ADDRESSES");
        uint24 defaultFee = uint24(vm.envOr("STOCK_DEFAULT_POOL_FEE", uint256(500)));

        string[] memory symbols = _split(symCsv);
        address[] memory addrs = _splitAddresses(addrCsv);
        require(symbols.length == addrs.length, "RhRegister: length");

        uint24[] memory fees = new uint24[](addrs.length);
        string memory feeCsv = vm.envOr("STOCK_FEES", string(""));
        if (bytes(feeCsv).length > 0) {
            string[] memory feeParts = _split(feeCsv);
            require(feeParts.length == addrs.length, "RhRegister: fee length");
            for (uint256 i = 0; i < feeParts.length; i++) {
                fees[i] = uint24(vm.parseUint(feeParts[i]));
            }
        } else {
            for (uint256 i = 0; i < fees.length; i++) {
                fees[i] = defaultFee;
            }
        }

        bool[] memory allowed = new bool[](addrs.length);
        for (uint256 i = 0; i < allowed.length; i++) {
            allowed[i] = true;
        }

        vm.startBroadcast(pk);
        StockTokenRegistry(registryAddr).setTokens(addrs, allowed, symbols, fees);
        vm.stopBroadcast();

        console.log("Registered", addrs.length, "tokens on", registryAddr);
    }

    function _split(string memory csv) internal pure returns (string[] memory parts) {
        uint256 count = 1;
        bytes memory b = bytes(csv);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] == ",") count++;
        }
        parts = new string[](count);
        uint256 idx;
        uint256 start;
        for (uint256 i = 0; i <= b.length; i++) {
            if (i == b.length || b[i] == ",") {
                bytes memory slice = new bytes(i - start);
                for (uint256 j = start; j < i; j++) {
                    slice[j - start] = b[j];
                }
                parts[idx++] = string(slice);
                start = i + 1;
            }
        }
    }

    function _splitAddresses(string memory csv) internal pure returns (address[] memory addrs) {
        string[] memory parts = _split(csv);
        addrs = new address[](parts.length);
        for (uint256 i = 0; i < parts.length; i++) {
            addrs[i] = vm.parseAddress(parts[i]);
        }
    }
}
