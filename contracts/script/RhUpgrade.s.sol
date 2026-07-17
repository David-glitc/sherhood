// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {PotCard} from "../src/PotCard.sol";
import {PotFactory} from "../src/PotFactory.sol";
import {RevealEngine} from "../src/RevealEngine.sol";
import {CardMarketplace} from "../src/CardMarketplace.sol";
import {EntryRouter} from "../src/EntryRouter.sol";
import {AssetManager} from "../src/AssetManager.sol";

interface IOldFactory {
    function revealEngine() external view returns (address);
    function assetManager() external view returns (address);
    function treasury() external view returns (address);
}

interface IRevealEngineView {
    function vrfCoordinator() external view returns (address);
}

/// @notice Minimal RH upgrade — redeploys ONLY contracts whose bytecode changed
///         (PotCard w/ EIP-2981+contractURI, PotFactory w/ new Pot, RevealEngine bound
///         to the new card, CardMarketplace w/ shell guard).
///         Reuses: TreasuryDirect, AssetManager, StockTokenRegistry, EntryRouter,
///         PrevRandaoCoordinator, $SHRH.
/// Env: DEPLOYER_PRIVATE_KEY, USDG_ADDRESS, OLD_FACTORY, ENTRY_ROUTER, STOCK_REGISTRY,
///      SHRH_ADDRESS, TREASURY_FEE_WALLET
contract RhUpgradeScript is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        address usdg = vm.envAddress("USDG_ADDRESS");
        address oldFactory = vm.envAddress("OLD_FACTORY");
        address entryRouter = vm.envAddress("ENTRY_ROUTER");
        address stockRegistry = vm.envAddress("STOCK_REGISTRY");
        address shrh = vm.envAddress("SHRH_ADDRESS");
        address feeWallet = vm.envAddress("TREASURY_FEE_WALLET");

        // Reuse live infrastructure discovered from the old factory.
        address treasury = IOldFactory(oldFactory).treasury();
        address assetManager = IOldFactory(oldFactory).assetManager();
        address vrfCoordinator = IRevealEngineView(IOldFactory(oldFactory).revealEngine()).vrfCoordinator();

        console.log("Reusing treasury", treasury);
        console.log("Reusing assetManager", assetManager);
        console.log("Reusing coordinator", vrfCoordinator);

        vm.startBroadcast(pk);

        PotCard card = new PotCard(deployer);
        PotFactory factory = new PotFactory(deployer, usdg, address(card));
        RevealEngine reveal = new RevealEngine(deployer, address(card), vrfCoordinator);
        CardMarketplace market = new CardMarketplace(deployer, address(card), usdg, treasury);

        card.setMinter(address(factory));
        card.setRevealer(address(reveal));
        card.setBaseURI("https://sherhood.xyz/api/cards/");
        card.setContractURI("https://sherhood.xyz/api/collection");
        card.setRoyalty(feeWallet, 250);

        factory.setAssetManager(assetManager);
        factory.setRevealEngine(address(reveal));
        factory.setTreasury(treasury);
        factory.setEntryRouter(entryRouter);
        factory.setStockRegistry(stockRegistry);
        factory.setCreationFee(vm.envOr("CREATION_FEE", uint256(5e18)));

        EntryRouter(payable(entryRouter)).setFactory(address(factory));

        reveal.setOperator(deployer, true);
        reveal.setLuckToken(shrh, vm.envOr("SHRH_LUCK_THRESHOLD", uint256(1000e18)), vm.envOr("SHRH_LUCK_BOOST_BPS", uint256(2500)));
        reveal.setVRFConfig(bytes32(uint256(1)), 1, 2_500_000);

        // Optional seed basket (skipped by default to save gas)
        if (vm.envOr("SEED_POT", false)) {
            address seedPot = factory.createPot(
                vm.envOr("SEED_POT_GOAL", uint256(100e18)),
                vm.envOr("SEED_POT_DURATION", uint256(5 days)),
                vm.envOr("SEED_POT_MIN", uint256(1e18)),
                0,
                100
            );
            console.log("SEED_POT", seedPot);
        }

        vm.stopBroadcast();

        console.log("=== Sherhood RH upgrade (minimal) ===");
        console.log("POT_CARD", address(card));
        console.log("POT_FACTORY", address(factory));
        console.log("REVEAL_ENGINE", address(reveal));
        console.log("MARKETPLACE", address(market));
        console.log("Reused ENTRY_ROUTER", entryRouter);
        console.log("Reused STOCK_REGISTRY", stockRegistry);
        console.log("Reused TREASURY", treasury);
        console.log("Reused ASSET_MANAGER", assetManager);
        console.log("Deployer", deployer);
    }
}
