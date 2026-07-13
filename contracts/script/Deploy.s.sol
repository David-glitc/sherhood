// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Treasury} from "../src/Treasury.sol";
import {BuybackVault} from "../src/BuybackVault.sol";
import {PackManager} from "../src/PackManager.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address vrfCoordinator = vm.envAddress("VRF_COORDINATOR");

        vm.startBroadcast(deployerPrivateKey);

        address usdg;
        bool deployMockUsdg = vm.envOr("DEPLOY_MOCK_USDG", true);
        if (deployMockUsdg) {
            MockERC20 mockUsdg = new MockERC20("USDG", "USDG", 18);
            usdg = address(mockUsdg);
            console.log("Deployed MockUSDG at:", usdg);
        } else {
            usdg = vm.envAddress("USDG_ADDRESS");
            console.log("Using existing USDG at:", usdg);
        }

        Treasury treasury = new Treasury(usdg, deployer);
        console.log("Treasury deployed at:", address(treasury));

        BuybackVault buybackVault = new BuybackVault(usdg, address(treasury), deployer);
        console.log("BuybackVault deployed at:", address(buybackVault));

        PackManager packManager = new PackManager(
            usdg,
            address(treasury),
            address(buybackVault),
            vrfCoordinator,
            deployer
        );
        console.log("PackManager deployed at:", address(packManager));

        treasury.setDistributor(address(packManager));
        console.log("Distributor set on Treasury -> PackManager");

        vm.stopBroadcast();

        console.log("---");
        console.log("USDG:", usdg);
        console.log("Treasury:", address(treasury));
        console.log("BuybackVault:", address(buybackVault));
        console.log("PackManager:", address(packManager));
        console.log("Deployer:", deployer);
    }
}
