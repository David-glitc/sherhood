// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISwapRouter} from "./interfaces/ISwapRouter.sol";
import {Pot} from "./Pot.sol";

/// @title AssetManager — swaps pot USDG into the target asset after close
contract AssetManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable usdg;
    address public swapRouter;
    mapping(address => bool) public operators;

    event SwapRouterUpdated(address router);
    event OperatorUpdated(address indexed operator, bool allowed);
    event PotPurchased(address indexed pot, address indexed targetToken, uint256 usdgIn, uint256 assetOut);

    modifier onlyOwnerOrOperator() {
        require(msg.sender == owner() || operators[msg.sender], "AssetManager: not auth");
        _;
    }

    constructor(address owner_, address usdg_, address swapRouter_) Ownable(owner_) {
        require(usdg_ != address(0), "AssetManager: zero usdg");
        usdg = usdg_;
        swapRouter = swapRouter_;
    }

    function setSwapRouter(address router_) external onlyOwner {
        swapRouter = router_;
        emit SwapRouterUpdated(router_);
    }

    function setOperator(address operator, bool allowed) external onlyOwner {
        operators[operator] = allowed;
        emit OperatorUpdated(operator, allowed);
    }

    /// @notice Pull USDG from a closed pot, swap to target token, leave asset on the pot.
    function purchase(address pot, uint256 amountOutMinimum)
        external
        onlyOwnerOrOperator
        nonReentrant
        returns (uint256 amountOut)
    {
        Pot p = Pot(pot);
        require(p.status() == Pot.Status.Closed, "AssetManager: pot not closed");

        (uint256 swapAmount,) = p.pullForPurchase();
        require(swapAmount > 0, "AssetManager: nothing to buy");

        IERC20(usdg).forceApprove(swapRouter, 0);
        IERC20(usdg).forceApprove(swapRouter, swapAmount);

        amountOut = ISwapRouter(swapRouter).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: usdg,
                tokenOut: p.targetToken(),
                fee: p.swapFee(),
                recipient: pot,
                deadline: block.timestamp + 300,
                amountIn: swapAmount,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        p.markPurchased(amountOut);
        emit PotPurchased(pot, p.targetToken(), swapAmount, amountOut);
    }
}
