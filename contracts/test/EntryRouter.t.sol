// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pot} from "../src/Pot.sol";
import {PotCard} from "../src/PotCard.sol";
import {PotFactory} from "../src/PotFactory.sol";
import {RevealEngine} from "../src/RevealEngine.sol";
import {AssetManager} from "../src/AssetManager.sol";
import {Treasury} from "../src/Treasury.sol";
import {EntryRouter} from "../src/EntryRouter.sol";
import {StockTokenRegistry} from "../src/StockTokenRegistry.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockVRFCoordinator} from "../src/mocks/MockVRFCoordinator.sol";

contract MockWETH is MockERC20 {
    constructor() MockERC20("Wrapped Ether", "WETH", 18) {}

    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }

    receive() external payable {
        balanceOf[msg.sender] += msg.value;
    }
}

/// @dev 1 WETH → 2000 USDG
contract MockWethUsdgRouter {
    address public weth;
    address public usdg;

    constructor(address weth_, address usdg_) {
        weth = weth_;
        usdg = usdg_;
    }

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        require(params.tokenIn == weth && params.tokenOut == usdg, "bad pair");
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        amountOut = params.amountIn * 2000;
        require(amountOut >= params.amountOutMinimum, "slippage");
        MockERC20(usdg).mint(params.recipient, amountOut);
    }
}

contract EntryRouterTest is Test {
    MockERC20 usdg;
    MockWETH weth;
    MockERC20 nvda;
    MockWethUsdgRouter router;
    MockVRFCoordinator vrf;

    Treasury treasury;
    PotCard card;
    PotFactory factory;
    RevealEngine reveal;
    AssetManager assets;
    EntryRouter entry;
    StockTokenRegistry registry;

    address deployer = address(0xA11CE);
    address alice = address(0xB0B);

    function setUp() public {
        vm.startPrank(deployer);
        usdg = new MockERC20("USDG", "USDG", 18);
        weth = new MockWETH();
        nvda = new MockERC20("NVDA", "NVDA", 18);
        router = new MockWethUsdgRouter(address(weth), address(usdg));
        vrf = new MockVRFCoordinator();

        treasury = new Treasury(address(usdg), deployer);
        card = new PotCard(deployer);
        factory = new PotFactory(deployer, address(usdg), address(card));
        reveal = new RevealEngine(deployer, address(card), address(vrf));
        assets = new AssetManager(deployer, address(usdg), address(router));
        registry = new StockTokenRegistry(deployer);
        entry = new EntryRouter(deployer, address(usdg), address(weth), address(router), address(treasury), address(factory));

        card.setMinter(address(factory));
        card.setRevealer(address(reveal));
        factory.setAssetManager(address(assets));
        factory.setRevealEngine(address(reveal));
        factory.setTreasury(address(treasury));
        factory.setEntryRouter(address(entry));
        factory.setStockRegistry(address(registry));
        assets.setStockRegistry(address(registry));
        registry.setToken(address(nvda), true, "NVDA", 3000);
        reveal.setVRFConfig(bytes32("k"), 1, 500_000);
        vrf.setConsumer(address(reveal));
        vm.stopPrank();

        vm.deal(alice, 100 ether);
    }

    function test_depositWithETH_skimsFee_and_mintsCard() public {
        vm.prank(deployer);
        address pot = factory.createPot(1_000_000e18, 7 days, 10e18, 0, 100);

        uint256 treasuryBefore = treasury.feesCollectedUSDG();
        vm.prank(alice);
        uint256 tokenId = entry.depositWithETH{value: 1 ether}(pot, 0);

        // 1 ETH → 2000 USDG; 0.5% fee = 10 USDG; deposit = 1990
        assertEq(treasury.feesCollectedUSDG(), treasuryBefore + 10e18);
        assertEq(Pot(pot).totalDeposited(), 1990e18);
        assertEq(card.ownerOf(tokenId), alice);
        PotCard.CardData memory c = card.getCard(tokenId);
        assertEq(c.depositAmount, 1990e18);
        assertEq(c.pot, pot);
    }

    function test_rejectNonPot() public {
        vm.prank(alice);
        vm.expectRevert(bytes("Entry: bad pot"));
        entry.depositWithETH{value: 1 ether}(address(0xBEEF), 0);
    }

    function test_depositWithWETH() public {
        vm.prank(deployer);
        address pot = factory.createPot(1_000_000e18, 7 days, 1e18, 1e18, 100);

        vm.startPrank(alice);
        weth.deposit{value: 2 ether}();
        weth.approve(address(entry), 2 ether);
        uint256 tokenId = entry.depositWithWETH(pot, 2 ether, 0);
        vm.stopPrank();

        // 4000 USDG out; fee 20; entry 1; deposit 3979
        assertEq(card.ownerOf(tokenId), alice);
        assertEq(Pot(pot).totalDeposited(), 3979e18);
        assertEq(Pot(pot).totalEntryFees(), 1e18);
    }
}
