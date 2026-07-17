// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pot} from "../src/Pot.sol";
import {PotCard} from "../src/PotCard.sol";
import {PotFactory} from "../src/PotFactory.sol";
import {RevealEngine} from "../src/RevealEngine.sol";
import {AssetManager} from "../src/AssetManager.sol";
import {Treasury} from "../src/Treasury.sol";
import {MockVRFCoordinator} from "../src/mocks/MockVRFCoordinator.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

/// @notice End-to-end business flow on local anvil against addresses from env.
contract SimulateBusinessFlowScript is Script {
    function run() external {
        uint256 pk = vm.envOr(
            "ANVIL_PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address deployer = vm.addr(pk);

        PotFactory factory = PotFactory(vm.envAddress("POT_FACTORY"));
        RevealEngine reveal = RevealEngine(vm.envAddress("REVEAL_ENGINE"));
        AssetManager assets = AssetManager(vm.envAddress("ASSET_MANAGER"));
        Treasury treasury = Treasury(vm.envAddress("TREASURY"));
        PotCard card = PotCard(vm.envAddress("POT_CARD"));
        address usdg = vm.envAddress("USDG");
        address nvda = vm.envAddress("NVDA");
        MockVRFCoordinator vrf = MockVRFCoordinator(vm.envAddress("VRF"));

        uint256 alicePk = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
        uint256 bobPk = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;
        uint256 carolPk = 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6;
        address alice = vm.addr(alicePk);
        address bob = vm.addr(bobPk);
        address carol = vm.addr(carolPk);

        // 1) Platform pot
        vm.startBroadcast(pk);
        address pot = factory.createPot(300e18, 7 days, 50e18, 2e18, 100);
        vm.stopBroadcast();
        console.log("POT", pot);

        // 2) Deposits
        _deposit(alicePk, pot, usdg, 100e18);
        _deposit(bobPk, pot, usdg, 100e18);
        _deposit(carolPk, pot, usdg, 100e18);
        console.log("status after fill", uint256(Pot(pot).status()));

        // 3) Purchase + sweep fees
        vm.startBroadcast(pk);
        assets.purchaseWithSeed(pot, 0xDEAD, 1, 0);
        Pot(pot).sweepFees();
        uint256 req = reveal.requestReveal(pot);
        vm.stopBroadcast();

        // 4) VRF fulfill (as anyone who can call mock)
        vm.startBroadcast(pk);
        uint256[] memory words = new uint256[](1);
        words[0] = 0xDEADBEEF;
        vrf.fulfill(req, words);
        vm.stopBroadcast();

        console.log("treasury fees", treasury.feesCollectedUSDG());
        console.log("status revealed", uint256(Pot(pot).status()));

        // 5) Claims
        uint256[] memory ids = card.potTokenIds(pot);
        _claim(alicePk, pot, ids[0]);
        _claim(bobPk, pot, ids[1]);
        _claim(carolPk, pot, ids[2]);

        console.log("alice nvda", MockERC20(nvda).balanceOf(alice));
        console.log("bob nvda", MockERC20(nvda).balanceOf(bob));
        console.log("carol nvda", MockERC20(nvda).balanceOf(carol));
        console.log("claimCount", Pot(pot).claimCount());
        console.log("SIMULATION_OK");
    }

    function _deposit(uint256 userPk, address pot, address usdg, uint256 amount) internal {
        address user = vm.addr(userPk);
        uint256 fee = Pot(pot).entryFee();
        vm.startBroadcast(userPk);
        IERC20(usdg).approve(pot, amount + fee);
        Pot(pot).deposit(amount);
        vm.stopBroadcast();
        console.log("deposited", user, amount);
    }

    function _claim(uint256 userPk, address pot, uint256 tokenId) internal {
        vm.startBroadcast(userPk);
        Pot(pot).claim(tokenId);
        vm.stopBroadcast();
        console.log("claimed", tokenId);
    }
}
