// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {PotCard} from "../src/PotCard.sol";
import {PotFactory} from "../src/PotFactory.sol";
import {RevealEngine} from "../src/RevealEngine.sol";
import {AssetManager} from "../src/AssetManager.sol";
import {TreasuryDirect} from "../src/TreasuryDirect.sol";
import {CardMarketplace} from "../src/CardMarketplace.sol";
import {EntryRouter} from "../src/EntryRouter.sol";
import {StockTokenRegistry} from "../src/StockTokenRegistry.sol";
import {PrevRandaoCoordinator} from "../src/PrevRandaoCoordinator.sol";
import {SherhoodToken} from "../src/SherhoodToken.sol";

/// @notice Deploy Sherhood pot stack to Robinhood Chain (4663) — includes Pot.earlyExit (5%).
/// Env: DEPLOYER_PRIVATE_KEY, USDG_ADDRESS, WETH_ADDRESS, SWAP_ROUTER, TREASURY_FEE_WALLET
/// VRF: leave VRF_COORDINATOR empty / zero → auto-deploy PrevRandaoCoordinator.
contract RhDeployScript is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        address usdg = vm.envAddress("USDG_ADDRESS");
        address weth = vm.envAddress("WETH_ADDRESS");
        address swapRouter = vm.envAddress("SWAP_ROUTER");
        address feeWallet = vm.envAddress("TREASURY_FEE_WALLET");
        require(feeWallet != address(0), "RhDeploy: TREASURY_FEE_WALLET");
        address vrfCoordinator = vm.envOr("VRF_COORDINATOR", address(0));
        uint256 prevDelay = vm.envOr("PREVRANDAO_DELAY_BLOCKS", uint256(2));

        console.log("Fee wallet", feeWallet);
        console.log("Require ~0.01 ETH on deployer before broadcast");

        vm.startBroadcast(pk);

        if (vrfCoordinator == address(0)) {
            PrevRandaoCoordinator entropy = new PrevRandaoCoordinator(prevDelay, vm.envOr("PREVRANDAO_MAX_DELAY_BLOCKS", uint256(64)));
            vrfCoordinator = address(entropy);
            console.log("PREVRANDAO_COORDINATOR", vrfCoordinator);
        }

        TreasuryDirect treasury = new TreasuryDirect(usdg, feeWallet, deployer);
        PotCard card = new PotCard(deployer);
        PotFactory factory = new PotFactory(deployer, usdg, address(card));
        RevealEngine reveal = new RevealEngine(deployer, address(card), vrfCoordinator);
        AssetManager assets = new AssetManager(deployer, usdg, swapRouter);
        StockTokenRegistry registry = new StockTokenRegistry(deployer);

        // Reuse the live $SHRH if SHRH_ADDRESS is set — only mint a new token when unset.
        address shrh = vm.envOr("SHRH_ADDRESS", address(0));
        if (shrh == address(0)) {
            shrh = address(new SherhoodToken(deployer, feeWallet));
            console.log("Deployed new SHRH", shrh);
        } else {
            console.log("Reusing SHRH", shrh);
        }
        EntryRouter entry = new EntryRouter(deployer, usdg, weth, swapRouter, address(treasury), address(factory));
        CardMarketplace market = new CardMarketplace(deployer, address(card), usdg, address(treasury));

        card.setMinter(address(factory));
        card.setRevealer(address(reveal));
        card.setBaseURI("https://sherhood.xyz/api/cards/");
        factory.setAssetManager(address(assets));
        factory.setRevealEngine(address(reveal));
        factory.setTreasury(address(treasury));
        factory.setEntryRouter(address(entry));
        factory.setStockRegistry(address(registry));
        assets.setStockRegistry(address(registry));
        assets.setOperator(deployer, true);
        reveal.setOperator(deployer, true);
        reveal.setLuckToken(shrh, vm.envOr("SHRH_LUCK_THRESHOLD", uint256(1000e18)), vm.envOr("SHRH_LUCK_BOOST_BPS", uint256(2500)));
        factory.setCreationFee(vm.envOr("CREATION_FEE", uint256(5e18)));

        bytes32 keyHash = vm.envOr("VRF_KEY_HASH", bytes32(uint256(1)));
        uint64 subId = uint64(vm.envOr("VRF_SUB_ID", uint256(1)));
        uint32 gasLimit = uint32(vm.envOr("VRF_CALLBACK_GAS", uint256(2_500_000)));
        reveal.setVRFConfig(keyHash, subId, gasLimit);

        uint24 wethUsdgFee = uint24(vm.envOr("WETH_USDG_POOL_FEE", uint256(500)));
        entry.setWethUsdgPoolFee(wethUsdgFee);
        entry.setRouterFeeBps(vm.envOr("ROUTER_FEE_BPS", uint256(50)));

        // Seed a funding basket so early-exit UI can be exercised immediately.
        uint256 seedGoal = vm.envOr("SEED_POT_GOAL", uint256(100e18));
        uint256 seedDuration = vm.envOr("SEED_POT_DURATION", uint256(5 days));
        uint256 seedMin = vm.envOr("SEED_POT_MIN", uint256(1e18));
        address seedPot = factory.createPot(seedGoal, seedDuration, seedMin, 0, 100);
        console.log("SEED_POT", seedPot);

        vm.stopBroadcast();

        console.log("=== Sherhood RH redeploy (earlyExit) ===");
        console.log("USDG", usdg);
        console.log("WETH", weth);
        console.log("SWAP_ROUTER", swapRouter);
        console.log("VRF_OR_PREVRANDAO", vrfCoordinator);
        console.log("TREASURY_DIRECT", address(treasury));
        console.log("TREASURY_FEE_WALLET", feeWallet);
        console.log("POT_CARD", address(card));
        console.log("POT_FACTORY", address(factory));
        console.log("REVEAL_ENGINE", address(reveal));
        console.log("ASSET_MANAGER", address(assets));
        console.log("ENTRY_ROUTER", address(entry));
        console.log("STOCK_REGISTRY", address(registry));
        console.log("SHRH", shrh);
        console.log("MARKETPLACE", address(market));
        console.log("Deployer", deployer);
    }
}
