// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PotCard} from "../src/PotCard.sol";
import {CardMarketplace} from "../src/CardMarketplace.sol";
import {Treasury} from "../src/Treasury.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract CardMarketplaceTest is Test {
    MockERC20 usdg;
    PotCard card;
    Treasury treasury;
    CardMarketplace market;

    address deployer = address(0xA11CE);
    address alice = address(0xB0B);
    address bob = address(0xB0B2);

    function setUp() public {
        vm.startPrank(deployer);
        usdg = new MockERC20("USDG", "USDG", 18);
        treasury = new Treasury(address(usdg), deployer);
        card = new PotCard(deployer);
        market = new CardMarketplace(deployer, address(card), address(usdg), address(treasury));
        card.setMinter(deployer);
        card.setCardMarketplace(address(market));
        vm.stopPrank();

        usdg.mint(alice, 100_000e18);
        usdg.mint(bob, 100_000e18);

        vm.prank(deployer);
        card.mintUnrevealed(alice, address(0x711), 100e18, false);
    }

    function test_listBuy_royaltyToTreasury() public {
        vm.startPrank(alice);
        card.approve(address(market), 1);
        market.list(1, 1_000e18);
        vm.stopPrank();

        uint256 aliceBefore = usdg.balanceOf(alice);
        uint256 treasuryBefore = treasury.feesCollectedUSDG();

        vm.startPrank(bob);
        usdg.approve(address(market), 1_000e18);
        market.buy(1);
        vm.stopPrank();

        assertEq(card.ownerOf(1), bob);
        // 2.5% of 1000 = 25
        assertEq(treasury.feesCollectedUSDG(), treasuryBefore + 25e18);
        assertEq(usdg.balanceOf(alice), aliceBefore + 975e18);
        (, , bool activeAfterBuy) = market.listings(1);
        assertFalse(activeAfterBuy);
    }

    function test_cancel() public {
        vm.startPrank(alice);
        card.approve(address(market), 1);
        market.list(1, 500e18);
        market.cancel(1);
        vm.stopPrank();
        (, , bool active) = market.listings(1);
        assertFalse(active);
    }

    function test_cannotBuyUnlisted() public {
        vm.prank(bob);
        vm.expectRevert(bytes("Market: listed"));
        market.buy(1);
    }

    function test_claimedCardIsBurned_cannotList() public {
        // Claim burns the card, so a redeemed shell can never be listed or traded anywhere.
        address pot = address(0x711);
        vm.startPrank(deployer);
        card.setRevealer(deployer);
        card.revealCard(1, 1e18, PotCard.Rarity.Common);
        vm.stopPrank();

        vm.prank(pot);
        card.burnForClaim(1);

        vm.expectRevert(abi.encodeWithSignature("ERC721NonexistentToken(uint256)", 1));
        card.ownerOf(1);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("ERC721NonexistentToken(uint256)", 1));
        market.list(1, 100e18);
    }

    function test_listedBlocksTransferAndExit() public {
        vm.startPrank(alice);
        card.approve(address(market), 1);
        market.list(1, 100e18);
        vm.expectRevert(bytes("Card: listed"));
        card.transferFrom(alice, bob, 1);
        market.cancel(1);
        card.transferFrom(alice, bob, 1);
        vm.stopPrank();
        assertEq(card.ownerOf(1), bob);
    }

    function test_eip2981_defaultRoyalty() public {
        (address receiver, uint256 amount) = card.royaltyInfo(1, 10_000);
        assertEq(receiver, deployer);
        assertEq(amount, 250); // 2.5% of 10000
    }
}
