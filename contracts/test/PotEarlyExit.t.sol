// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Pot} from "../src/Pot.sol";
import {PotCard} from "../src/PotCard.sol";
import {PotHarness} from "./PotBusiness.t.sol";

contract PotEarlyExitTest is PotHarness {
    function setUp() public {
        _setUpStack();
    }

    function test_earlyExit_takes5pct_and_refunds95() public {
        address pot = _createPlatformPot(1_000e18, 7 days, 10e18, 0);
        _deposit(alice, pot, 100e18);

        uint256 id = card.potTokenIds(pot)[0];
        uint256 balBefore = usdg.balanceOf(alice);
        uint256 treasuryBefore = usdg.balanceOf(address(treasury));

        (uint256 dep, uint256 fee, uint256 refund) = Pot(pot).previewEarlyExit(id);
        assertEq(dep, 100e18);
        assertEq(fee, 5e18);
        assertEq(refund, 95e18);

        vm.prank(alice);
        uint256 got = Pot(pot).earlyExit(id);
        assertEq(got, 95e18);

        assertEq(usdg.balanceOf(alice), balBefore + 95e18);
        assertEq(usdg.balanceOf(address(treasury)), treasuryBefore + 5e18);
        assertEq(Pot(pot).totalDeposited(), 0);
        assertEq(Pot(pot).participantCount(), 0);
        assertEq(card.potTokenCount(pot), 0);

        vm.expectRevert();
        card.ownerOf(id);
    }

    function test_earlyExit_secondDepositor_preservesOthers() public {
        address pot = _createPlatformPot(1_000e18, 7 days, 10e18, 0);
        _deposit(alice, pot, 100e18);
        _deposit(bob, pot, 200e18);

        uint256 aliceId = card.potTokenIds(pot)[0];
        vm.prank(alice);
        Pot(pot).earlyExit(aliceId);

        assertEq(Pot(pot).totalDeposited(), 200e18);
        assertEq(Pot(pot).participantCount(), 1);
        assertEq(card.potTokenCount(pot), 1);
        assertEq(card.ownerOf(card.potTokenIds(pot)[0]), bob);
    }

    function test_earlyExit_afterClose_reverts() public {
        address pot = _createPlatformPot(100e18, 7 days, 10e18, 0);
        _deposit(alice, pot, 50e18);
        _deposit(bob, pot, 50e18);
        assertEq(uint256(Pot(pot).status()), uint256(Pot.Status.Closed));

        uint256 id = card.potTokenIds(pot)[0];
        vm.prank(alice);
        vm.expectRevert(bytes("Pot: funding"));
        Pot(pot).earlyExit(id);
    }

    function test_earlyExit_wrongOwner_reverts() public {
        address pot = _createPlatformPot(1_000e18, 7 days, 10e18, 0);
        _deposit(alice, pot, 50e18);
        uint256 id = card.potTokenIds(pot)[0];

        vm.prank(bob);
        vm.expectRevert(bytes("Pot: owner"));
        Pot(pot).earlyExit(id);
    }

    function test_reveal_after_earlyExit_ignoresBurned() public {
        address pot = _createPlatformPot(300e18, 7 days, 10e18, 0);
        _deposit(alice, pot, 100e18);
        _deposit(bob, pot, 100e18);

        uint256 aliceId = card.potTokenIds(pot)[0];
        vm.prank(alice);
        Pot(pot).earlyExit(aliceId);

        _deposit(carol, pot, 200e18);
        assertEq(uint256(Pot(pot).status()), uint256(Pot.Status.Closed));

        _runToRevealed(pot, 42);
        assertEq(uint256(Pot(pot).status()), uint256(Pot.Status.Revealed));
        assertEq(card.potTokenCount(pot), 2);
    }

    function test_earlyExit_cooldown_blocks_cycle() public {
        address pot = _createPlatformPot(1_000e18, 7 days, 10e18, 0);
        _deposit(alice, pot, 100e18);
        uint256 id1 = card.potTokenIds(pot)[0];
        vm.prank(alice);
        Pot(pot).earlyExit(id1);

        _deposit(alice, pot, 100e18);
        uint256 id2 = card.potTokenIds(pot)[0];
        vm.prank(alice);
        vm.expectRevert(bytes("Pot: cooldown"));
        Pot(pot).earlyExit(id2);

        vm.warp(block.timestamp + 1 hours);
        vm.prank(alice);
        Pot(pot).earlyExit(id2);
        assertEq(Pot(pot).participantCount(), 0);
    }
}
