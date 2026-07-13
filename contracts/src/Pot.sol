// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PotCard} from "./PotCard.sol";

interface IPotFactoryView {
    function mintCard(address to, uint256 depositAmount) external returns (uint256 tokenId);
    function paused() external view returns (bool);
    function treasury() external view returns (address);
}

interface ITreasuryFee {
    function depositFeeUSDG(uint256 amount) external;
}

/// @title Pot — funding vault for a single fractional asset loot game
contract Pot is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        Funding,
        Closed,
        Purchased,
        Revealed
    }

    uint256 public constant OWNERSHIP_ONE = 1e18;

    address public immutable usdg;
    address public immutable factory;
    address public immutable targetToken;
    uint24 public immutable swapFee;
    uint256 public immutable fundingGoal;
    uint256 public immutable deadline;
    uint256 public immutable minDeposit;
    uint256 public immutable entryFee;
    uint256 public immutable protocolFeeBps;
    address public immutable creator;

    PotCard public immutable card;
    address public assetManager;
    address public revealEngine;
    address public entryRouter;

    Status public status;
    uint256 public totalDeposited;
    uint256 public totalEntryFees;
    uint256 public assetAmount;
    uint256 public participantCount;
    uint256 public feesSwept;
    uint256 public assetsClaimed;
    uint256 public claimCount;
    bool public purchasePulled;

    event Deposited(address indexed user, uint256 amount, uint256 entryFeePaid, uint256 indexed tokenId);
    event Closed(uint256 totalDeposited, uint256 participantCount);
    event Purchased(uint256 usdgSpent, uint256 assetAmount);
    event Revealed();
    event FeesSwept(address indexed treasury, uint256 amount);
    event Claimed(address indexed user, uint256 indexed tokenId, uint256 assetPayout);
    event AssetManagerSet(address assetManager);
    event RevealEngineSet(address revealEngine);
    event EntryRouterSet(address entryRouter);
    event DustSwept(address indexed to, uint256 amount);

    modifier onlyFactory() {
        require(msg.sender == factory, "Pot: only factory");
        _;
    }

    modifier onlyAssetManager() {
        require(msg.sender == assetManager, "Pot: only asset manager");
        _;
    }

    modifier onlyRevealEngine() {
        require(msg.sender == revealEngine, "Pot: only reveal engine");
        _;
    }

    modifier whenFactoryNotPaused() {
        require(!IPotFactoryView(factory).paused(), "Pot: factory paused");
        _;
    }

    constructor(
        address owner_,
        address creator_,
        address usdg_,
        address factory_,
        address card_,
        address targetToken_,
        uint24 swapFee_,
        uint256 fundingGoal_,
        uint256 duration_,
        uint256 minDeposit_,
        uint256 entryFee_,
        uint256 protocolFeeBps_
    ) Ownable(owner_) {
        require(usdg_ != address(0) && factory_ != address(0) && card_ != address(0), "Pot: zero addr");
        require(targetToken_ != address(0) && creator_ != address(0), "Pot: zero target/creator");
        require(fundingGoal_ > 0, "Pot: zero goal");
        require(duration_ > 0, "Pot: zero duration");
        require(protocolFeeBps_ <= 2000, "Pot: fee too high");

        usdg = usdg_;
        factory = factory_;
        creator = creator_;
        card = PotCard(card_);
        targetToken = targetToken_;
        swapFee = swapFee_;
        fundingGoal = fundingGoal_;
        deadline = block.timestamp + duration_;
        minDeposit = minDeposit_;
        entryFee = entryFee_;
        protocolFeeBps = protocolFeeBps_;
        status = Status.Funding;
    }

    function setAssetManager(address assetManager_) external onlyFactory {
        assetManager = assetManager_;
        emit AssetManagerSet(assetManager_);
    }

    function setRevealEngine(address revealEngine_) external onlyFactory {
        revealEngine = revealEngine_;
        emit RevealEngineSet(revealEngine_);
    }

    function setEntryRouter(address entryRouter_) external onlyFactory {
        entryRouter = entryRouter_;
        emit EntryRouterSet(entryRouter_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Contribute USDG; mints one unrevealed ownership card.
    function deposit(uint256 amount)
        external
        nonReentrant
        whenNotPaused
        whenFactoryNotPaused
        returns (uint256 tokenId)
    {
        return _deposit(msg.sender, msg.sender, amount);
    }

    /// @notice EntryRouter deposits USDG on behalf of a user (card minted to beneficiary).
    function depositFor(address beneficiary, uint256 amount)
        external
        nonReentrant
        whenNotPaused
        whenFactoryNotPaused
        returns (uint256 tokenId)
    {
        require(msg.sender == entryRouter, "Pot: only entry router");
        require(beneficiary != address(0), "Pot: zero beneficiary");
        return _deposit(msg.sender, beneficiary, amount);
    }

    function _deposit(address payer, address beneficiary, uint256 amount) private returns (uint256 tokenId) {
        require(status == Status.Funding, "Pot: not funding");
        require(block.timestamp < deadline, "Pot: deadline passed");
        require(amount >= minDeposit, "Pot: below min");
        require(totalDeposited + amount <= fundingGoal, "Pot: exceeds goal");

        uint256 fee = entryFee;
        uint256 pull = amount + fee;
        IERC20(usdg).safeTransferFrom(payer, address(this), pull);

        totalDeposited += amount;
        if (fee > 0) totalEntryFees += fee;
        participantCount += 1;

        tokenId = IPotFactoryView(factory).mintCard(beneficiary, amount);

        emit Deposited(beneficiary, amount, fee, tokenId);

        if (totalDeposited == fundingGoal) {
            _close();
        }
    }

    function close() external nonReentrant whenNotPaused {
        require(status == Status.Funding, "Pot: not funding");
        bool goalMet = totalDeposited >= fundingGoal;
        bool timeUp = block.timestamp >= deadline;
        require(goalMet || timeUp, "Pot: not ready");
        require(participantCount > 0, "Pot: empty");
        _close();
    }

    function _close() private {
        status = Status.Closed;
        emit Closed(totalDeposited, participantCount);
    }

    function protocolFeeOwed() public view returns (uint256) {
        return (totalDeposited * protocolFeeBps) / 10_000;
    }

    function feesOwed() public view returns (uint256) {
        return protocolFeeOwed() + totalEntryFees;
    }

    /// @notice Transfer USDG for purchase once (protocol fee retained for treasury sweep).
    function pullForPurchase() external onlyAssetManager returns (uint256 swapAmount, uint256 protocolFee) {
        require(status == Status.Closed, "Pot: not closed");
        require(!purchasePulled, "Pot: already pulled");
        purchasePulled = true;
        protocolFee = protocolFeeOwed();
        swapAmount = totalDeposited - protocolFee;
        if (swapAmount > 0) {
            IERC20(usdg).safeTransfer(msg.sender, swapAmount);
        }
    }

    function markPurchased(uint256 assetAmount_) external onlyAssetManager {
        require(status == Status.Closed, "Pot: not closed");
        require(purchasePulled, "Pot: not pulled");
        assetAmount = assetAmount_;
        status = Status.Purchased;
        emit Purchased(totalDeposited - protocolFeeOwed(), assetAmount_);
    }

    function markRevealed() external onlyRevealEngine {
        require(status == Status.Purchased, "Pot: not purchased");
        status = Status.Revealed;
        emit Revealed();
    }

    /// @notice Sweep entry + protocol USDG fees to Treasury. Callable after purchase.
    function sweepFees() external nonReentrant returns (uint256 amount) {
        require(status == Status.Purchased || status == Status.Revealed, "Pot: too early");
        amount = feesOwed() - feesSwept;
        require(amount > 0, "Pot: nothing to sweep");
        address treasury = IPotFactoryView(factory).treasury();
        require(treasury != address(0), "Pot: no treasury");

        uint256 bal = IERC20(usdg).balanceOf(address(this));
        if (amount > bal) amount = bal;
        require(amount > 0, "Pot: empty bal");

        feesSwept += amount;
        IERC20(usdg).forceApprove(treasury, 0);
        IERC20(usdg).forceApprove(treasury, amount);
        ITreasuryFee(treasury).depositFeeUSDG(amount);

        emit FeesSwept(treasury, amount);
    }

    /// @notice Redeem revealed card for proportional share of purchased assets.
    function claim(uint256 tokenId) external nonReentrant whenNotPaused whenFactoryNotPaused returns (uint256 payout) {
        require(status == Status.Revealed, "Pot: not revealed");
        require(card.ownerOf(tokenId) == msg.sender, "Pot: not owner");

        PotCard.CardData memory c = card.getCard(tokenId);
        require(c.pot == address(this), "Pot: wrong pot");
        require(c.revealed, "Pot: unrevealed");
        require(!c.claimed, "Pot: claimed");

        payout = (assetAmount * c.ownershipWeight) / OWNERSHIP_ONE;
        require(payout > 0, "Pot: zero payout");

        card.markClaimed(tokenId);
        assetsClaimed += payout;
        claimCount += 1;

        IERC20(targetToken).safeTransfer(msg.sender, payout);
        emit Claimed(msg.sender, tokenId, payout);
    }

    /// @notice After every card claimed, owner sweeps rounding dust of target asset.
    function sweepAssetDust(address to) external onlyOwner {
        require(status == Status.Revealed, "Pot: not revealed");
        require(claimCount == participantCount, "Pot: claims pending");
        require(to != address(0), "Pot: zero");
        uint256 bal = IERC20(targetToken).balanceOf(address(this));
        require(bal > 0, "Pot: no dust");
        IERC20(targetToken).safeTransfer(to, bal);
        emit DustSwept(to, bal);
    }

    function fundingProgressBps() external view returns (uint256) {
        return (totalDeposited * 10_000) / fundingGoal;
    }

    function previewClaim(uint256 tokenId) external view returns (uint256 payout) {
        PotCard.CardData memory c = card.getCard(tokenId);
        if (!c.revealed || c.claimed || c.pot != address(this)) return 0;
        return (assetAmount * c.ownershipWeight) / OWNERSHIP_ONE;
    }
}
