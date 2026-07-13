// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Pot} from "../src/Pot.sol";
import {PotCard} from "../src/PotCard.sol";
import {PotFactory} from "../src/PotFactory.sol";
import {RevealEngine} from "../src/RevealEngine.sol";
import {AssetManager} from "../src/AssetManager.sol";
import {Treasury} from "../src/Treasury.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockVRFCoordinator} from "../src/mocks/MockVRFCoordinator.sol";
import {MockSwapRouter} from "../src/mocks/MockSwapRouter.sol";

/// @dev Handler drives random deposits while pot is funding; invariants checked by suite.
contract PotHandler is Test {
    PotFactory public factory;
    Pot public pot;
    MockERC20 public usdg;
    uint256 public ghostDeposits;
    uint256 public ghostParticipants;

    constructor(PotFactory factory_, Pot pot_, MockERC20 usdg_) {
        factory = factory_;
        pot = pot_;
        usdg = usdg_;
    }

    function deposit(uint256 amountSeed) public {
        if (pot.status() != Pot.Status.Funding) return;
        if (block.timestamp >= pot.deadline()) return;

        uint256 remaining = pot.fundingGoal() - pot.totalDeposited();
        if (remaining < pot.minDeposit()) return;

        uint256 amount = bound(amountSeed, pot.minDeposit(), remaining);
        address user = address(uint160(uint256(keccak256(abi.encode(amountSeed, ghostParticipants))) | 1));
        usdg.mint(user, amount + pot.entryFee());
        vm.startPrank(user);
        usdg.approve(address(pot), amount + pot.entryFee());
        pot.deposit(amount);
        vm.stopPrank();
        ghostDeposits += amount;
        ghostParticipants += 1;
    }
}

contract PotInvariantTest is Test {
    MockERC20 usdg;
    MockERC20 nvda;
    PotFactory factory;
    PotCard card;
    Pot pot;
    PotHandler handler;
    Treasury treasury;
    RevealEngine reveal;
    AssetManager assets;
    MockVRFCoordinator vrf;
    MockSwapRouter router;

    address deployer = address(this);

    function setUp() public {
        usdg = new MockERC20("USDG", "USDG", 18);
        nvda = new MockERC20("NVDA", "NVDA", 18);
        vrf = new MockVRFCoordinator();
        router = new MockSwapRouter();
        treasury = new Treasury(address(usdg), deployer);
        card = new PotCard(deployer);
        factory = new PotFactory(deployer, address(usdg), address(card));
        reveal = new RevealEngine(deployer, address(card), address(vrf));
        assets = new AssetManager(deployer, address(usdg), address(router));

        card.setMinter(address(factory));
        card.setRevealer(address(reveal));
        factory.setAssetManager(address(assets));
        factory.setRevealEngine(address(reveal));
        factory.setTreasury(address(treasury));
        factory.setRequireRegisteredStock(false);
        reveal.setVRFConfig(bytes32("k"), 1, 500_000);
        vrf.setConsumer(address(reveal));

        address potAddr = factory.createPot(address(nvda), 3000, 10_000e18, 30 days, 1e18, 0, 100);
        pot = Pot(potAddr);
        handler = new PotHandler(factory, pot, usdg);

        targetContract(address(handler));
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = PotHandler.deposit.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    function invariant_depositsMatchAccounting() public view {
        assertEq(pot.totalDeposited(), handler.ghostDeposits());
        assertEq(pot.participantCount(), handler.ghostParticipants());
        assertEq(card.potTokenCount(address(pot)), handler.ghostParticipants());
        assertLe(pot.totalDeposited(), pot.fundingGoal());
    }

    function invariant_usdgSolvencyWhileFunding() public view {
        if (pot.status() != Pot.Status.Funding && pot.status() != Pot.Status.Closed) return;
        uint256 bal = usdg.balanceOf(address(pot));
        assertEq(bal, pot.totalDeposited() + pot.totalEntryFees());
    }
}
