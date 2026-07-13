// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {RaffleManager} from "../src/RaffleManager.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockERC20 is IERC20 {
    string public name;
    string public symbol;
    uint8 public _decimals;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    constructor(string memory _name, string memory _symbol, uint8 decimals_) {
        name = _name;
        symbol = _symbol;
        _decimals = decimals_;
    }

    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }
    function totalSupply() external pure override returns (uint256) { return 0; }
    function decimals() external view returns (uint8) { return _decimals; }

    function transfer(address to, uint256 amount) external override returns (bool) {
        balanceOf[msg.sender] -= amount; balanceOf[to] += amount; return true;
    }
    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount; return true;
    }
    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        allowance[from][msg.sender] -= amount; balanceOf[from] -= amount; balanceOf[to] += amount; return true;
    }
}

contract MockVRFCoordinator {
    address public consumer;
    uint256 private _nextRequestId = 1;

    function setConsumer(address _consumer) external { consumer = _consumer; }

    function requestRandomWords(bytes32, uint64, uint16, uint32, uint32 numWords) external returns (uint256) {
        uint256 requestId = _nextRequestId++;
        return requestId;
    }

    function fulfill(uint256 requestId, uint256[] memory randomWords) external {
        (bool success,) = consumer.call(
            abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, randomWords)
        );
        require(success, "fulfill failed");
    }
}

contract MockSwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        MockERC20 nvda = MockERC20(params.tokenOut);
        uint256 outAmount = params.amountIn / 1000;
        nvda.mint(params.recipient, outAmount);
        return outAmount;
    }
}

contract RaffleManagerTest is Test {
    MockERC20 usdg;
    MockERC20 nvda;
    RaffleManager raffle;
    MockVRFCoordinator vrfCoordinator;
    MockSwapRouter swapRouter;

    address deployer = address(0x1);
    address user1 = address(0x2);
    address user2 = address(0x3);
    address user3 = address(0x4);

    function setUp() public {
        vm.startPrank(deployer);
        usdg = new MockERC20("USDG", "USDG", 18);
        nvda = new MockERC20("NVDA", "NVDA", 18);
        vrfCoordinator = new MockVRFCoordinator();
        swapRouter = new MockSwapRouter();

        raffle = new RaffleManager(
            address(usdg),
            address(vrfCoordinator),
            address(swapRouter),
            deployer
        );

        vrfCoordinator.setConsumer(address(raffle));
        raffle.setVRFConfig(bytes32(uint256(0x1234)), 1, 500000);

        usdg.mint(user1, 1000 ether);
        usdg.mint(user2, 1000 ether);
        usdg.mint(user3, 1000 ether);
        vm.stopPrank();

        vm.prank(deployer);
        raffle.createRound(
            address(nvda),           // targetToken
            3000,                     // swapFee (0.3%)
            10 ether,                 // entryFee
            5,                        // maxEntries
            1 hours,                  // duration
            500,                      // feePercent (5%)
            2                         // maxWinners
        );
    }

    function test_CreateRound() public {
        RaffleManager.Round memory r = raffle.getRound(0);
        assertEq(address(r.targetToken), address(nvda));
        assertEq(r.entryFee, 10 ether);
        assertEq(uint256(r.state), uint256(RaffleManager.RoundState.Open));
    }

    function test_EnterRound() public {
        vm.startPrank(user1);
        usdg.approve(address(raffle), 10 ether);
        raffle.enter(0);
        vm.stopPrank();

        assertEq(raffle.getEntryCount(0), 1);
    }

    function test_FullFlow() public {
        for (uint256 i = 1; i <= 5; i++) {
            address u = address(uint160(i + 1));
            usdg.mint(u, 100 ether);
            vm.startPrank(u);
            usdg.approve(address(raffle), 10 ether);
            raffle.enter(0);
            vm.stopPrank();
        }
        assertEq(raffle.getEntryCount(0), 5);

        vm.prank(deployer);
        raffle.closeRound(0);

        RaffleManager.Round memory r = raffle.getRound(0);
        assertEq(uint256(r.state), uint256(RaffleManager.RoundState.Closed));

        uint256[] memory randomWords = new uint256[](2);
        randomWords[0] = 12345;
        randomWords[1] = 67890;
        vrfCoordinator.fulfill(1, randomWords);

        r = raffle.getRound(0);
        assertEq(uint256(r.state), uint256(RaffleManager.RoundState.Resolved));
        assertEq(raffle.getWinnerCount(0), 2);

        nvda.mint(address(swapRouter), 100 ether);

        vm.prank(deployer);
        raffle.buyTokens(0, 0);

        r = raffle.getRound(0);
        assertEq(uint256(r.state), uint256(RaffleManager.RoundState.Bought));
        assertTrue(r.tokenAmount > 0);
    }

    function test_RevertEnterWhenRoundExpired() public {
        vm.warp(block.timestamp + 2 hours);

        vm.startPrank(user1);
        usdg.approve(address(raffle), 10 ether);
        vm.expectRevert("Raffle: time expired");
        raffle.enter(0);
        vm.stopPrank();
    }

    function test_RevertEnterWhenMaxEntriesReached() public {
        for (uint256 i = 1; i <= 5; i++) {
            address u = address(uint160(i + 1));
            usdg.mint(u, 100 ether);
            vm.startPrank(u);
            usdg.approve(address(raffle), 10 ether);
            raffle.enter(0);
            vm.stopPrank();
        }

        vm.startPrank(user1);
        usdg.approve(address(raffle), 10 ether);
        vm.expectRevert("Raffle: max entries");
        raffle.enter(0);
        vm.stopPrank();
    }
}
