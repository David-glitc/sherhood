// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title PotCard — mystery → revealed fractional ownership NFT
/// @notice Each deposit mints one card. Reveal sets ownership weight (1e18 = 100%) and rarity.
contract PotCard is ERC721, Ownable {
    enum Rarity {
        Unrevealed,
        Common,
        Rare,
        Epic,
        Legendary
    }

    struct CardData {
        address pot;
        uint256 depositAmount;
        uint256 ownershipWeight; // 1e18 = 100% of pot
        Rarity rarity;
        bool revealed;
        bool claimed;
    }

    address public minter;
    address public revealer;

    uint256 private _nextTokenId = 1;
    mapping(uint256 => CardData) public cards;
    mapping(address => uint256[]) private _potTokenIds;

    event MinterUpdated(address minter);
    event RevealerUpdated(address revealer);
    event CardMinted(uint256 indexed tokenId, address indexed pot, address indexed to, uint256 depositAmount);
    event CardRevealed(uint256 indexed tokenId, uint256 ownershipWeight, Rarity rarity);
    event CardClaimed(uint256 indexed tokenId);

    modifier onlyMinter() {
        require(msg.sender == minter, "PotCard: only minter");
        _;
    }

    modifier onlyRevealer() {
        require(msg.sender == revealer, "PotCard: only revealer");
        _;
    }

    constructor(address owner_) ERC721("Sherwood Pot Card", "SHWOOD") Ownable(owner_) {}

    function setMinter(address minter_) external onlyOwner {
        minter = minter_;
        emit MinterUpdated(minter_);
    }

    function setRevealer(address revealer_) external onlyOwner {
        revealer = revealer_;
        emit RevealerUpdated(revealer_);
    }

    function mintUnrevealed(address to, address pot, uint256 depositAmount)
        external
        onlyMinter
        returns (uint256 tokenId)
    {
        require(to != address(0), "PotCard: zero to");
        require(pot != address(0), "PotCard: zero pot");
        require(depositAmount > 0, "PotCard: zero deposit");

        tokenId = _nextTokenId++;
        cards[tokenId] = CardData({
            pot: pot,
            depositAmount: depositAmount,
            ownershipWeight: 0,
            rarity: Rarity.Unrevealed,
            revealed: false,
            claimed: false
        });
        _potTokenIds[pot].push(tokenId);
        _safeMint(to, tokenId);

        emit CardMinted(tokenId, pot, to, depositAmount);
    }

    function revealCard(uint256 tokenId, uint256 ownershipWeight, Rarity rarity) external onlyRevealer {
        CardData storage card = cards[tokenId];
        require(_ownerOf(tokenId) != address(0), "PotCard: nonexistent");
        require(!card.revealed, "PotCard: already revealed");
        require(rarity != Rarity.Unrevealed, "PotCard: bad rarity");
        require(ownershipWeight > 0, "PotCard: zero ownership");

        card.ownershipWeight = ownershipWeight;
        card.rarity = rarity;
        card.revealed = true;

        emit CardRevealed(tokenId, ownershipWeight, rarity);
    }

    /// @notice Pot marks card claimed when owner redeems asset share.
    function markClaimed(uint256 tokenId) external {
        CardData storage card = cards[tokenId];
        require(msg.sender == card.pot, "PotCard: only pot");
        require(_ownerOf(tokenId) != address(0), "PotCard: nonexistent");
        require(card.revealed, "PotCard: not revealed");
        require(!card.claimed, "PotCard: already claimed");
        card.claimed = true;
        emit CardClaimed(tokenId);
    }

    function potTokenIds(address pot) external view returns (uint256[] memory) {
        return _potTokenIds[pot];
    }

    function potTokenCount(address pot) external view returns (uint256) {
        return _potTokenIds[pot].length;
    }

    function getCard(uint256 tokenId) external view returns (CardData memory) {
        require(_ownerOf(tokenId) != address(0), "PotCard: nonexistent");
        return cards[tokenId];
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}
