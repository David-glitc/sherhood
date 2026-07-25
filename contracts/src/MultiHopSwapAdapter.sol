// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISwapRouter02} from "./interfaces/ISwapRouter02.sol";

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

interface IUniswapV3PoolMinimal {
    function liquidity() external view returns (uint128);
}

/// @notice Drop-in SwapRouter02 adapter for AssetManager / EntryRouter.
/// @dev Prefer direct USDG↔token when a liquid pool exists; otherwise multi-hop
///      USDG → WETH → token (or reverse) so stock buys work without direct USDG pools.
contract MultiHopSwapAdapter is Ownable {
    using SafeERC20 for IERC20;

    address public immutable innerRouter;
    address public immutable usdg;
    address public immutable weth;
    address public factory;

    /// @notice USDG/WETH pool fee (RH mainnet is 100).
    uint24 public usdgWethFee = 100;

    event FactoryUpdated(address factory);
    event UsdgWethFeeUpdated(uint24 fee);

    constructor(address owner_, address innerRouter_, address usdg_, address weth_, address factory_)
        Ownable(owner_)
    {
        require(
            innerRouter_ != address(0) && usdg_ != address(0) && weth_ != address(0) && factory_ != address(0),
            "MH: zero"
        );
        innerRouter = innerRouter_;
        usdg = usdg_;
        weth = weth_;
        factory = factory_;
    }

    function setFactory(address factory_) external onlyOwner {
        require(factory_ != address(0), "MH: zero");
        factory = factory_;
        emit FactoryUpdated(factory_);
    }

    function setUsdgWethFee(uint24 fee_) external onlyOwner {
        require(fee_ > 0, "MH: fee");
        usdgWethFee = fee_;
        emit UsdgWethFeeUpdated(fee_);
    }

    function exactInputSingle(ISwapRouter02.ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);

        // Direct path when a live pool exists at the requested fee.
        if (_poolLive(params.tokenIn, params.tokenOut, params.fee)) {
            IERC20(params.tokenIn).forceApprove(innerRouter, 0);
            IERC20(params.tokenIn).forceApprove(innerRouter, params.amountIn);
            amountOut = ISwapRouter02(innerRouter).exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: params.tokenIn,
                    tokenOut: params.tokenOut,
                    fee: params.fee,
                    recipient: params.recipient,
                    amountIn: params.amountIn,
                    amountOutMinimum: params.amountOutMinimum,
                    sqrtPriceLimitX96: params.sqrtPriceLimitX96
                })
            );
            return amountOut;
        }

        // Multi-hop via WETH: tokenIn → WETH → tokenOut (covers USDG→stock and stock→USDG).
        require(params.tokenIn != weth && params.tokenOut != weth, "MH: no hop");
        require(_poolLive(params.tokenIn, weth, _feeInToWeth(params.tokenIn, params.fee)), "MH: leg1");
        require(_poolLive(weth, params.tokenOut, _feeWethToOut(params.tokenOut, params.fee)), "MH: leg2");

        uint24 fee1 = _feeInToWeth(params.tokenIn, params.fee);
        uint24 fee2 = _feeWethToOut(params.tokenOut, params.fee);

        bytes memory path = abi.encodePacked(params.tokenIn, fee1, weth, fee2, params.tokenOut);

        IERC20(params.tokenIn).forceApprove(innerRouter, 0);
        IERC20(params.tokenIn).forceApprove(innerRouter, params.amountIn);
        amountOut = ISwapRouter02(innerRouter).exactInput(
            ISwapRouter02.ExactInputParams({
                path: path,
                recipient: params.recipient,
                amountIn: params.amountIn,
                amountOutMinimum: params.amountOutMinimum
            })
        );
    }

    function _feeInToWeth(address tokenIn, uint24 requested) private view returns (uint24) {
        if (tokenIn == usdg) return usdgWethFee;
        // Stock → WETH uses registry fee (requested).
        return requested;
    }

    function _feeWethToOut(address tokenOut, uint24 requested) private view returns (uint24) {
        if (tokenOut == usdg) return usdgWethFee;
        return requested;
    }

    function _poolLive(address a, address b, uint24 fee) private view returns (bool) {
        address pool = IUniswapV3Factory(factory).getPool(a, b, fee);
        if (pool == address(0)) return false;
        return IUniswapV3PoolMinimal(pool).liquidity() > 0;
    }
}
