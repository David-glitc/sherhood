// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Treasury} from "../src/Treasury.sol";
import {BuybackVault} from "../src/BuybackVault.sol";
import {PackManager} from "../src/PackManager.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockPriceFeed} from "../src/mocks/MockPriceFeed.sol";

contract ConfigureScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address usdg = vm.envAddress("USDG_ADDRESS");
        address treasuryAddr = vm.envAddress("TREASURY_ADDRESS");
        address buybackVaultAddr = vm.envAddress("BUYBACK_VAULT_ADDRESS");
        address packManagerAddr = vm.envAddress("PACK_MANAGER_ADDRESS");

        Treasury treasury = Treasury(treasuryAddr);
        BuybackVault buybackVault = BuybackVault(buybackVaultAddr);
        PackManager packManager = PackManager(packManagerAddr);

        address user = vm.envOr("TEST_USER", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy mock stock tokens
        MockERC20 nvda = new MockERC20("NVDA Stock Token", "NVDA", 18);
        MockERC20 aapl = new MockERC20("AAPL Stock Token", "AAPL", 18);
        MockERC20 goog = new MockERC20("GOOG Stock Token", "GOOG", 18);
        console.log("NVDA:", address(nvda));
        console.log("AAPL:", address(aapl));
        console.log("GOOG:", address(goog));

        // Deploy mock price feeds
        MockPriceFeed nvdaFeed = new MockPriceFeed(50000 * 1e8, 8);
        MockPriceFeed aaplFeed = new MockPriceFeed(20000 * 1e8, 8);
        MockPriceFeed googFeed = new MockPriceFeed(15000 * 1e8, 8);
        console.log("NVDA PriceFeed:", address(nvdaFeed));
        console.log("AAPL PriceFeed:", address(aaplFeed));
        console.log("GOOG PriceFeed:", address(googFeed));

        // Set price feeds on BuybackVault
        buybackVault.setPriceFeed(address(nvda), address(nvdaFeed));
        buybackVault.setPriceFeed(address(aapl), address(aaplFeed));
        buybackVault.setPriceFeed(address(goog), address(googFeed));
        console.log("Price feeds set on BuybackVault");

        // Create tiers
        uint256 standardId = packManager.createTier("Standard Pack", 5 ether);
        console.log("Tier created: Standard Pack (id=%s, price=5 USDG)", standardId);

        uint256 premiumId = packManager.createTier("Premium Pack", 15 ether);
        console.log("Tier created: Premium Pack (id=%s, price=15 USDG)", premiumId);

        uint256 rareId = packManager.createTier("Rare Pack", 40 ether);
        console.log("Tier created: Rare Pack (id=%s, price=40 USDG)", rareId);

        uint256 legendaryId = packManager.createTier("Legendary Pack", 100 ether);
        console.log("Tier created: Legendary Pack (id=%s, price=100 USDG)", legendaryId);

        // Set drop tables
        {
            PackManager.DropEntry[] memory entries = new PackManager.DropEntry[](4);
            entries[0] = PackManager.DropEntry(PackManager.Rarity.Common, 60, address(nvda), 0.001 ether, 0.01 ether);
            entries[1] = PackManager.DropEntry(PackManager.Rarity.Uncommon, 25, address(aapl), 0.01 ether, 0.05 ether);
            entries[2] = PackManager.DropEntry(PackManager.Rarity.Rare, 12, address(goog), 0.05 ether, 0.1 ether);
            entries[3] = PackManager.DropEntry(PackManager.Rarity.Legendary, 3, address(nvda), 0.1 ether, 0.5 ether);
            packManager.setDropTable(standardId, entries);
            console.log("Drop table set for Standard Pack");
        }

        {
            PackManager.DropEntry[] memory entries = new PackManager.DropEntry[](4);
            entries[0] = PackManager.DropEntry(PackManager.Rarity.Uncommon, 50, address(aapl), 0.03 ether, 0.1 ether);
            entries[1] = PackManager.DropEntry(PackManager.Rarity.Rare, 35, address(goog), 0.1 ether, 0.3 ether);
            entries[2] = PackManager.DropEntry(PackManager.Rarity.Legendary, 12, address(nvda), 0.2 ether, 0.7 ether);
            entries[3] = PackManager.DropEntry(PackManager.Rarity.Legendary, 3, address(goog), 0.3 ether, 1.0 ether);
            packManager.setDropTable(premiumId, entries);
            console.log("Drop table set for Premium Pack");
        }

        {
            PackManager.DropEntry[] memory entries = new PackManager.DropEntry[](3);
            entries[0] = PackManager.DropEntry(PackManager.Rarity.Rare, 60, address(goog), 0.2 ether, 0.5 ether);
            entries[1] = PackManager.DropEntry(PackManager.Rarity.Legendary, 30, address(nvda), 0.3 ether, 1.0 ether);
            entries[2] = PackManager.DropEntry(PackManager.Rarity.Legendary, 10, address(aapl), 0.5 ether, 1.5 ether);
            packManager.setDropTable(rareId, entries);
            console.log("Drop table set for Rare Pack");
        }

        {
            PackManager.DropEntry[] memory entries = new PackManager.DropEntry[](2);
            entries[0] = PackManager.DropEntry(PackManager.Rarity.Legendary, 80, address(nvda), 0.5 ether, 2.0 ether);
            entries[1] = PackManager.DropEntry(PackManager.Rarity.Legendary, 20, address(aapl), 1.0 ether, 3.0 ether);
            packManager.setDropTable(legendaryId, entries);
            console.log("Drop table set for Legendary Pack");
        }

        // Mint stock tokens to Treasury for pack distribution
        nvda.mint(address(treasury), 10_000 ether);
        aapl.mint(address(treasury), 10_000 ether);
        goog.mint(address(treasury), 10_000 ether);
        console.log("Minted 10,000 stock tokens each to Treasury");

        // Mint USDG to Treasury for buyback liquidity
        MockERC20(usdg).mint(address(treasury), 500_000 ether);
        console.log("Minted 500,000 USDG to Treasury");

        // Mint USDG to test user for opening packs
        MockERC20(usdg).mint(user, 10_000 ether);
        console.log("Minted 10,000 USDG to test user");

        vm.stopBroadcast();

        console.log("---");
        console.log("USDG:", usdg);
        console.log("NVDA:", address(nvda));
        console.log("AAPL:", address(aapl));
        console.log("GOOG:", address(goog));
        console.log("NVDA PriceFeed:", address(nvdaFeed));
        console.log("AAPL PriceFeed:", address(aaplFeed));
        console.log("GOOG PriceFeed:", address(googFeed));
        console.log("User (funded):", user);
    }
}
