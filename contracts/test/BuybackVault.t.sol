// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BuybackVault} from "../src/BuybackVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockToken is IERC20 {
    string public name;
    string public symbol;
    uint8 public immutable _decimals;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    constructor(string memory n, string memory s, uint8 d) {
        name = n;
        symbol = s;
        _decimals = d;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
    }

    function totalSupply() external pure override returns (uint256) {
        return 0;
    }

    function transfer(address to, uint256 amt) external override returns (bool) {
        balanceOf[msg.sender] -= amt;
        balanceOf[to] += amt;
        return true;
    }

    function approve(address sp, uint256 amt) external override returns (bool) {
        allowance[msg.sender][sp] = amt;
        return true;
    }

    function transferFrom(address f, address t, uint256 amt) external override returns (bool) {
        allowance[f][msg.sender] -= amt;
        balanceOf[f] -= amt;
        balanceOf[t] += amt;
        return true;
    }
}

contract FreshPriceFeed {
    int256 public answer;
    uint8 public decimals;

    constructor(int256 a, uint8 d) {
        answer = a;
        decimals = d;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        // updatedAt = now so BuybackVault's staleness guard passes.
        return (1, answer, 0, block.timestamp, 1);
    }
}

contract BuybackVaultTest is Test {
    BuybackVault vault;
    MockToken usdg; // 6 decimals, like Global Dollar on RH
    MockToken stock; // 18 decimals
    FreshPriceFeed feed; // 8 decimals, like Chainlink

    address treasury = address(0xABCD);
    address owner = address(this);
    address user = address(0xBEEF);

    function setUp() public {
        vm.warp(1_700_000_000); // non-zero now so `now - 1h` doesn't underflow-guard trivially
        usdg = new MockToken("USDG", "USDG", 6);
        stock = new MockToken("NVDA", "NVDA", 18);
        feed = new FreshPriceFeed(150e8, 8); // $150.00

        vault = new BuybackVault(address(usdg), treasury, owner);
        vault.setPriceFeed(address(stock), address(feed));

        // Fund the vault with a realistic amount of USDG: $1,000,000 at 6 decimals.
        usdg.mint(address(vault), 1_000_000 * 1e6);
    }

    // 1 stock token at $150, 85% buyback => $127.50 => 127_500_000 USDG base units (6 dec).
    function test_calculateBuyback_correct6DecScaling() public view {
        uint256 out = vault.calculateBuyback(address(stock), 1e18);
        assertEq(out, 127_500_000, "expected $127.50 in 6-dec USDG units");
    }

    /// Regression: the old code produced an 18-dec figure (~1.275e20) that would drain the vault.
    function test_calculateBuyback_notOverpaying() public view {
        uint256 out = vault.calculateBuyback(address(stock), 1e18);
        assertLt(out, 1e12, "payout must be in 6-dec range, not 18-dec");
    }

    function test_acceptBuyback_paysAndDoesNotDrain() public {
        stock.mint(user, 1e18);
        uint256 vaultBefore = usdg.balanceOf(address(vault));

        vm.startPrank(user);
        stock.approve(address(vault), 1e18);
        vault.acceptBuyback(address(stock), 1e18);
        vm.stopPrank();

        assertEq(usdg.balanceOf(user), 127_500_000, "user receives $127.50");
        assertEq(stock.balanceOf(treasury), 1e18, "stock forwarded to treasury");
        assertEq(usdg.balanceOf(address(vault)), vaultBefore - 127_500_000, "vault debited exactly the quote");
    }

    function test_usdgDecimalsCached() public view {
        assertEq(vault.usdgDecimals(), 6);
    }
}
