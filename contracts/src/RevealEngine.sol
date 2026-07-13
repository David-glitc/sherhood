// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {VRFConsumerBaseV2} from "chainlink-brownie-contracts/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {VRFCoordinatorV2Interface} from "chainlink-brownie-contracts/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import {Pot} from "./Pot.sol";
import {PotCard} from "./PotCard.sol";

/// @title RevealEngine — VRF-backed ownership allocation (always sums to 100%, always > 0)
/// @dev Multipliers in [0.5x, 2.0x] applied to deposit amounts, then normalized to 1e18.
contract RevealEngine is VRFConsumerBaseV2, Ownable {
    uint256 public constant OWNERSHIP_ONE = 1e18;
    uint256 public constant MULT_FLOOR = 5_000; // 0.50x in bps of 1x
    uint256 public constant MULT_CEIL = 20_000; // 2.00x
    uint256 public constant MULT_SPAN = MULT_CEIL - MULT_FLOOR + 1;

    PotCard public immutable card;
    address public immutable vrfCoordinator;

    bytes32 public keyHash;
    uint64 public subscriptionId;
    uint32 public callbackGasLimit = 2_500_000;
    uint16 public requestConfirmations = 3;

    mapping(uint256 => address) public requestToPot;
    mapping(address => uint256) public potRequestId;
    mapping(address => bool) public revealRequested;
    mapping(address => bool) public operators;

    event VRFConfigSet(bytes32 keyHash, uint64 subId, uint32 gasLimit);
    event RevealRequested(address indexed pot, uint256 requestId);
    event RevealFulfilled(address indexed pot, uint256 totalOwnership);
    event OperatorUpdated(address indexed operator, bool allowed);

    modifier onlyOwnerOrOperator() {
        require(msg.sender == owner() || operators[msg.sender], "RevealEngine: not auth");
        _;
    }

    constructor(address owner_, address card_, address vrfCoordinator_)
        VRFConsumerBaseV2(vrfCoordinator_)
        Ownable(owner_)
    {
        require(card_ != address(0) && vrfCoordinator_ != address(0), "RevealEngine: zero");
        card = PotCard(card_);
        vrfCoordinator = vrfCoordinator_;
    }

    function setVRFConfig(bytes32 keyHash_, uint64 subId_, uint32 gasLimit_) external onlyOwner {
        keyHash = keyHash_;
        subscriptionId = subId_;
        callbackGasLimit = gasLimit_;
        emit VRFConfigSet(keyHash_, subId_, gasLimit_);
    }

    function setOperator(address operator, bool allowed) external onlyOwner {
        operators[operator] = allowed;
        emit OperatorUpdated(operator, allowed);
    }

    function requestReveal(address pot) external onlyOwnerOrOperator returns (uint256 requestId) {
        Pot p = Pot(pot);
        require(p.status() == Pot.Status.Purchased, "RevealEngine: not purchased");
        require(!revealRequested[pot], "RevealEngine: already requested");
        require(card.potTokenCount(pot) > 0, "RevealEngine: no cards");

        requestId = VRFCoordinatorV2Interface(vrfCoordinator).requestRandomWords(
            keyHash, subscriptionId, requestConfirmations, callbackGasLimit, 1
        );
        requestToPot[requestId] = pot;
        potRequestId[pot] = requestId;
        revealRequested[pot] = true;

        emit RevealRequested(pot, requestId);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address pot = requestToPot[requestId];
        require(pot != address(0), "RevealEngine: unknown request");
        _allocate(pot, randomWords[0]);
    }

    /// @notice Test/dev helper when VRF is mocked — owner or operator.
    function allocateWithSeed(address pot, uint256 seed) external onlyOwnerOrOperator {
        Pot p = Pot(pot);
        require(p.status() == Pot.Status.Purchased, "RevealEngine: not purchased");
        require(!revealRequested[pot], "RevealEngine: already requested");
        revealRequested[pot] = true;
        _allocate(pot, seed);
    }

    function _allocate(address pot, uint256 seed) private {
        uint256[] memory tokenIds = card.potTokenIds(pot);
        uint256 n = tokenIds.length;
        require(n > 0, "RevealEngine: empty");
        require(n <= OWNERSHIP_ONE, "RevealEngine: too many");

        uint256[] memory raw = new uint256[](n);
        uint256[] memory multipliers = new uint256[](n);
        uint256 rawSum;

        for (uint256 i = 0; i < n; i++) {
            PotCard.CardData memory c = card.getCard(tokenIds[i]);
            uint256 roll = uint256(keccak256(abi.encode(seed, i, tokenIds[i])));
            uint256 mult = MULT_FLOOR + (roll % MULT_SPAN);
            multipliers[i] = mult;
            raw[i] = c.depositAmount * mult;
            rawSum += raw[i];
        }
        require(rawSum > 0, "RevealEngine: zero raw");

        uint256[] memory weights = new uint256[](n);
        uint256 assigned;
        for (uint256 i = 0; i < n; i++) {
            weights[i] = (raw[i] * OWNERSHIP_ONE) / rawSum;
            if (weights[i] == 0) weights[i] = 1; // floor: every card owns something
            assigned += weights[i];
        }

        if (assigned > OWNERSHIP_ONE) {
            // Steal overflow from the largest weight while keeping floor of 1
            uint256 overflow = assigned - OWNERSHIP_ONE;
            while (overflow > 0) {
                uint256 maxIdx;
                uint256 maxW = 0;
                for (uint256 i = 0; i < n; i++) {
                    if (weights[i] > maxW) {
                        maxW = weights[i];
                        maxIdx = i;
                    }
                }
                require(maxW > 1, "RevealEngine: cannot floor");
                uint256 take = overflow < (maxW - 1) ? overflow : (maxW - 1);
                weights[maxIdx] -= take;
                overflow -= take;
            }
        } else if (assigned < OWNERSHIP_ONE) {
            // Give remainder to the largest raw contributor
            uint256 maxIdx;
            uint256 maxRaw = 0;
            for (uint256 i = 0; i < n; i++) {
                if (raw[i] > maxRaw) {
                    maxRaw = raw[i];
                    maxIdx = i;
                }
            }
            weights[maxIdx] += OWNERSHIP_ONE - assigned;
        }

        uint256 total;
        for (uint256 i = 0; i < n; i++) {
            require(weights[i] > 0, "RevealEngine: zero weight");
            PotCard.Rarity rarity = _rarityFromMultiplier(multipliers[i]);
            card.revealCard(tokenIds[i], weights[i], rarity);
            total += weights[i];
        }
        require(total == OWNERSHIP_ONE, "RevealEngine: not 100%");

        Pot(pot).markRevealed();
        emit RevealFulfilled(pot, total);
    }

    function _rarityFromMultiplier(uint256 multBps) private pure returns (PotCard.Rarity) {
        // 0.50–0.90 Common, 0.90–1.20 Rare, 1.20–1.60 Epic, 1.60–2.00 Legendary
        if (multBps >= 16_000) return PotCard.Rarity.Legendary;
        if (multBps >= 12_000) return PotCard.Rarity.Epic;
        if (multBps >= 9_000) return PotCard.Rarity.Rare;
        return PotCard.Rarity.Common;
    }
}
