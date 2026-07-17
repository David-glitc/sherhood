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
import {MockERC20} from "../src/mocks/MockERC20.sol";

/// @notice Deploy pot stack to a remote/devnet RPC (uses real VRF + router from env).
contract PotDeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address vrfCoordinator = vm.envAddress("VRF_COORDINATOR");
        address swapRouter = vm.envAddress("SWAP_ROUTER");

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
        PotCard card = new PotCard(deployer);
        PotFactory factory = new PotFactory(deployer, usdg, address(card));
        RevealEngine reveal = new RevealEngine(deployer, address(card), vrfCoordinator);
        AssetManager assets = new AssetManager(deployer, usdg, swapRouter);

        card.setMinter(address(factory));
        card.setRevealer(address(reveal));
        factory.setAssetManager(address(assets));
        factory.setRevealEngine(address(reveal));
        factory.setTreasury(address(treasury));
        factory.setCreationFee(vm.envOr("CREATION_FEE", uint256(5e18)));

        CardMarketplace market = new CardMarketplace(deployer, address(card), usdg, address(treasury));

        bytes32 keyHash = vm.envOr("VRF_KEY_HASH", bytes32(0));
        uint64 subId = uint64(vm.envOr("VRF_SUB_ID", uint256(0)));
        uint32 gasLimit = uint32(vm.envOr("VRF_CALLBACK_GAS", uint256(2_500_000)));
        if (keyHash != bytes32(0) && subId != 0) {
            reveal.setVRFConfig(keyHash, subId, gasLimit);
        }

        vm.stopBroadcast();

        console.log("--- Pot stack ---");
        console.log("USDG:", usdg);
        console.log("Treasury:", address(treasury));
        console.log("PotCard:", address(card));
        console.log("PotFactory:", address(factory));
        console.log("RevealEngine:", address(reveal));
        console.log("AssetManager:", address(assets));
        console.log("Marketplace:", address(market));
    }
}
