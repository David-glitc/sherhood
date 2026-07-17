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

/**
 * @title SherhoodDeploy
 * @notice Fresh Robinhood Chain deploy of the Sherhood basket stack.
 *
 * Deploys (clean slate):
 *   TreasuryDirect, PotCard, PotFactory, RevealEngine, AssetManager,
 *   StockTokenRegistry, EntryRouter, CardMarketplace, PrevRandaoCoordinator
 *
 * Does NOT deploy or hardcode $SHRH. After the token launches next week, the
 * deployer calls RevealEngine.setLuckToken(token, threshold, boostBps).
 * Recommended threshold ≈ amount of $SHRH equal to 0.055 ETH at launch price.
 * Boost requires that amount at deposit (lock) AND at reveal (dual check).
 *
 * Env:
 *   DEPLOYER_PRIVATE_KEY, USDG_ADDRESS, WETH_ADDRESS, SWAP_ROUTER,
 *   TREASURY_FEE_WALLET
 * Optional:
 *   CREATION_FEE (default 5e18), PREVRANDAO_DELAY_BLOCKS (default 2),
 *   ROUTER_FEE_BPS, WETH_USDG_POOL_FEE
 */
contract SherhoodDeployScript is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        address usdg = vm.envAddress("USDG_ADDRESS");
        address weth = vm.envAddress("WETH_ADDRESS");
        address swapRouter = vm.envAddress("SWAP_ROUTER");
        address feeWallet = vm.envAddress("TREASURY_FEE_WALLET");
        require(feeWallet != address(0), "SherhoodDeploy: TREASURY_FEE_WALLET");

        uint256 prevDelay = vm.envOr("PREVRANDAO_DELAY_BLOCKS", uint256(2));

        console.log("=== Sherhood fresh deploy ===");
        console.log("Deployer", deployer);
        console.log("Fee wallet", feeWallet);

        vm.startBroadcast(pk);

        PrevRandaoCoordinator entropy = new PrevRandaoCoordinator(prevDelay, vm.envOr("PREVRANDAO_MAX_DELAY_BLOCKS", uint256(64)));
        TreasuryDirect treasury = new TreasuryDirect(usdg, feeWallet, deployer);
        PotCard card = new PotCard(deployer);
        PotFactory factory = new PotFactory(deployer, usdg, address(card));
        RevealEngine reveal = new RevealEngine(deployer, address(card), address(entropy));
        AssetManager assets = new AssetManager(deployer, usdg, swapRouter);
        StockTokenRegistry registry = new StockTokenRegistry(deployer);
        EntryRouter entry = new EntryRouter(deployer, usdg, weth, swapRouter, address(treasury), address(factory));
        CardMarketplace market = new CardMarketplace(deployer, address(card), usdg, address(treasury));

        card.setMinter(address(factory));
        card.setRevealer(address(reveal));
        card.setCardMarketplace(address(market));
        card.setBaseURI("https://sherhood.xyz/api/cards/");
        card.setContractURI("https://sherhood.xyz/api/collection");
        card.setRoyalty(feeWallet, 250);

        factory.setAssetManager(address(assets));
        factory.setRevealEngine(address(reveal));
        factory.setTreasury(address(treasury));
        factory.setEntryRouter(address(entry));
        factory.setStockRegistry(address(registry));
        factory.setCreationFee(vm.envOr("CREATION_FEE", uint256(5e18)));

        assets.setStockRegistry(address(registry));
        assets.setOperator(deployer, true);
        assets.setSeededPurchaseEnabled(false);

        reveal.setOperator(deployer, true);
        reveal.setVRFConfig(bytes32(uint256(1)), 1, uint32(vm.envOr("VRF_CALLBACK_GAS", uint256(2_500_000))));

        entry.setWethUsdgPoolFee(uint24(vm.envOr("WETH_USDG_POOL_FEE", uint256(500))));
        entry.setRouterFeeBps(vm.envOr("ROUTER_FEE_BPS", uint256(50)));

        vm.stopBroadcast();

        console.log("--- Addresses ---");
        console.log("PREVRANDAO", address(entropy));
        console.log("TREASURY", address(treasury));
        console.log("CARD", address(card));
        console.log("FACTORY", address(factory));
        console.log("REVEAL", address(reveal));
        console.log("ASSETS", address(assets));
        console.log("REGISTRY", address(registry));
        console.log("ENTRY", address(entry));
        console.log("MARKET", address(market));
        console.log("SHRH: unset - call reveal.setLuckToken after token launch");
        console.log("Next: register stocks, then forge verify-contract on Blockscout");
    }
}
