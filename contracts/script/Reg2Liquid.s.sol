// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {StockTokenRegistry} from "src/StockTokenRegistry.sol";
import {AssetManager} from "src/AssetManager.sol";

contract Reg2 is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address am = 0x9313589D663A48D018360C2A62083B6e30194E80;
        vm.startBroadcast(pk);
        StockTokenRegistry reg = new StockTokenRegistry(vm.addr(pk));
        address[] memory addrs = new address[](2);
        bool[] memory allowed = new bool[](2);
        string[] memory symbols = new string[](2);
        uint24[] memory fees = new uint24[](2);
        addrs[0] = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;
        addrs[1] = 0xa30FA36Db767ad9eD3f7a60fC79526fB4d56D344;
        allowed[0] = true; allowed[1] = true;
        symbols[0] = "TSLA"; symbols[1] = "USO";
        fees[0] = 3000; fees[1] = 3000;
        reg.setTokens(addrs, allowed, symbols, fees);
        AssetManager(am).setStockRegistry(address(reg));
        vm.stopBroadcast();
        console.log("REG2", address(reg));
    }
}
