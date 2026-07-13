// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {RaffleManager} from "../src/RaffleManager.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract RaffleDeployScript is Script {
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
        }

        MockERC20 nvda = new MockERC20("NVDA Stock Token", "NVDA", 18);
        MockERC20 aapl = new MockERC20("AAPL Stock Token", "AAPL", 18);
        MockERC20 goog = new MockERC20("GOOG Stock Token", "GOOG", 18);
        console.log("NVDA:", address(nvda));
        console.log("AAPL:", address(aapl));
        console.log("GOOG:", address(goog));

        // On testnet we deploy a mock router too
        // address swapRouter = vm.envAddress("SWAP_ROUTER");
        address swapRouter = deployer; // placeholder for now

        RaffleManager raffle = new RaffleManager(
            usdg,
            vrfCoordinator,
            swapRouter,
            deployer
        );
        console.log("RaffleManager deployed at:", address(raffle));

        // Mint tokens for testing
        usdg = address(usdg);
        MockERC20(usdg).mint(deployer, 1_000_000 ether);
        nvda.mint(deployer, 100_000 ether);
        aapl.mint(deployer, 100_000 ether);
        goog.mint(deployer, 100_000 ether);

        vm.stopBroadcast();

        console.log("---");
        console.log("USDG:", usdg);
        console.log("NVDA:", address(nvda));
        console.log("AAPL:", address(aapl));
        console.log("GOOG:", address(goog));
        console.log("RaffleManager:", address(raffle));
        console.log("Deployer:", deployer);
    }
}
