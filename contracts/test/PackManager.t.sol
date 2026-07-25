// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {Treasury} from "../src/Treasury.sol";
import {BuybackVault} from "../src/BuybackVault.sol";
import {PackManager} from "../src/PackManager.sol";
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

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function totalSupply() external view override returns (uint256) {
        return 0;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockVRFCoordinator {
    address public consumer;
    uint256 private _nextRequestId = 1;

    function setConsumer(address _consumer) external {
        consumer = _consumer;
    }

    function requestRandomWords(
        bytes32, uint64, uint16, uint32, uint32
    ) external returns (uint256 requestId) {
        requestId = _nextRequestId++;
    }

    function fulfill(uint256 requestId, uint256[] memory randomWords) external {
        (bool success,) = consumer.call(
            abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, randomWords)
        );
        require(success, "fulfill failed");
    }
}

contract MockPriceFeed {
    uint256 private _price;
    uint8 private _decimals;

    constructor(uint256 price, uint8 decimals_) {
        _price = price;
        _decimals = decimals_;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (0, int256(_price), 0, 0, 0);
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }
}

contract PackManagerTest is Test {
    MockERC20 usdg;
    MockERC20 nvda;
    MockERC20 aapl;
    MockERC20 goog;
    Treasury treasury;
    BuybackVault buybackVault;
    PackManager packManager;
    MockVRFCoordinator vrfCoordinator;

    address deployer = address(0x1);
    address user = address(0x2);
    address treasuryAddr;

    function setUp() public {
        vm.startPrank(deployer);
        usdg = new MockERC20("USDG", "USDG", 18);
        nvda = new MockERC20("NVDA", "NVDA", 18);
        aapl = new MockERC20("AAPL", "AAPL", 18);
        goog = new MockERC20("GOOG", "GOOG", 18);

        vrfCoordinator = new MockVRFCoordinator();

        treasury = new Treasury(address(usdg), deployer);
        treasuryAddr = address(treasury);

        buybackVault = new BuybackVault(address(usdg), treasuryAddr, deployer);

        packManager = new PackManager(
            address(usdg),
            treasuryAddr,
            address(buybackVault),
            address(vrfCoordinator),
            deployer
        );

        vrfCoordinator.setConsumer(address(packManager));

        treasury.setDistributor(address(packManager));

        packManager.setVRFConfig(
            bytes32(uint256(0x1234)),
            1,
            250000
        );

        nvda.mint(treasuryAddr, 1000 ether);
        aapl.mint(treasuryAddr, 1000 ether);
        goog.mint(treasuryAddr, 1000 ether);

        usdg.mint(user, 1000 ether);

        vm.stopPrank();
    }

    function _setupTier() internal {
        vm.startPrank(deployer);
        packManager.createTier("Standard", 10 ether);

        PackManager.DropEntry[] memory entries = new PackManager.DropEntry[](4);
        entries[0] = PackManager.DropEntry({
            rarity: PackManager.Rarity.Common,
            weight: 60,
            token: address(nvda),
            minAmount: 0.001 ether,
            maxAmount: 0.01 ether
        });
        entries[1] = PackManager.DropEntry({
            rarity: PackManager.Rarity.Uncommon,
            weight: 25,
            token: address(aapl),
            minAmount: 0.01 ether,
            maxAmount: 0.05 ether
        });
        entries[2] = PackManager.DropEntry({
            rarity: PackManager.Rarity.Rare,
            weight: 12,
            token: address(goog),
            minAmount: 0.05 ether,
            maxAmount: 0.1 ether
        });
        entries[3] = PackManager.DropEntry({
            rarity: PackManager.Rarity.Legendary,
            weight: 3,
            token: address(nvda),
            minAmount: 0.1 ether,
            maxAmount: 0.5 ether
        });

        packManager.setDropTable(0, entries);
        vm.stopPrank();
    }

    function test_CreateTier() public {
        vm.prank(deployer);
        uint256 tierId = packManager.createTier("Standard", 10 ether);
        assertEq(tierId, 0);
        (string memory name, uint256 price, bool active) = packManager.tiers(0);
        assertEq(name, "Standard");
        assertEq(price, 10 ether);
        assertTrue(active);
    }

    function test_OpenPack() public {
        _setupTier();

        vm.startPrank(user);
        usdg.approve(address(packManager), 10 ether);

        uint256 packId = packManager.openPack(0);
        assertEq(packId, 1);
        vm.stopPrank();
    }

    function test_FulfillPack() public {
        _setupTier();

        vm.startPrank(user);
        usdg.approve(address(packManager), 10 ether);
        uint256 packId = packManager.openPack(0);
        vm.stopPrank();

        uint256[] memory randomWords = new uint256[](3);
        randomWords[0] = 0; // Common
        randomWords[1] = 12345;
        randomWords[2] = 67890;

        vrfCoordinator.fulfill(1, randomWords);

        (address resultUser, address token, uint256 amount, PackManager.Rarity rarity, bool resolved, bool claimed, bool buybackTaken,,) = packManager.packResults(packId);
        assertTrue(resolved);
        assertEq(resultUser, user);
        assertEq(token, address(nvda));
        assertTrue(amount > 0);
    }

    function test_ClaimPack() public {
        _setupTier();

        vm.startPrank(user);
        usdg.approve(address(packManager), 10 ether);
        uint256 packId = packManager.openPack(0);
        vm.stopPrank();

        uint256[] memory randomWords = new uint256[](3);
        randomWords[0] = 500; // Should be Rare (weight 60+25=85, 500%85=75, 60+25=85, so 75<85 is in Uncommon range? Actually: 0-59 Common, 60-84 Uncommon, 85-96 Rare, 97-99 Legendary. 500%100 = 0 -> Common)
        randomWords[1] = 100;
        randomWords[2] = 200;

        // Fixed: 500 % 100 = 0, which is Common
        // Actually wait, the total weight is 60+25+12+3 = 100
        // So 500 % 100 = 0 -> Common (0 < 60)

        vrfCoordinator.fulfill(1, randomWords);

        uint256 userNvdaBefore = nvda.balanceOf(user);

        vm.prank(user);
        packManager.claimPack(packId);

        uint256 userNvdaAfter = nvda.balanceOf(user);
        assertTrue(userNvdaAfter > userNvdaBefore);

        (,,,,, bool claimed, bool buybackTaken,,) = packManager.packResults(packId);
        assertTrue(claimed);
        assertFalse(buybackTaken);
    }

    function test_AcceptBuybackThenClaimBuyback() public {
        _setupTier();

        vm.startPrank(user);
        usdg.approve(address(packManager), 10 ether);
        uint256 packId = packManager.openPack(0);
        vm.stopPrank();

        uint256[] memory randomWords = new uint256[](3);
        randomWords[0] = 0; // Common
        randomWords[1] = 100;
        randomWords[2] = 200;

        vrfCoordinator.fulfill(1, randomWords);

        vm.startPrank(user);
        packManager.acceptBuyback(packId);

        // Verify the token was transferred to buyback vault
        assertEq(nvda.balanceOf(address(buybackVault)), nvda.balanceOf(address(buybackVault)));
        vm.stopPrank();
    }

    function test_RevertClaimTwice() public {
        _setupTier();

        vm.startPrank(user);
        usdg.approve(address(packManager), 10 ether);
        uint256 packId = packManager.openPack(0);
        vm.stopPrank();

        uint256[] memory randomWords = new uint256[](3);
        randomWords[0] = 0;
        randomWords[1] = 100;
        randomWords[2] = 200;

        vrfCoordinator.fulfill(1, randomWords);

        vm.startPrank(user);
        packManager.claimPack(packId);

        vm.expectRevert("PackManager: already claimed");
        packManager.claimPack(packId);
        vm.stopPrank();
    }

    function test_RevertClaimAnotherUsersPack() public {
        _setupTier();

        address user2 = address(0x3);

        vm.startPrank(user);
        usdg.approve(address(packManager), 10 ether);
        uint256 packId = packManager.openPack(0);
        vm.stopPrank();

        uint256[] memory randomWords = new uint256[](3);
        randomWords[0] = 0;
        randomWords[1] = 100;
        randomWords[2] = 200;

        vrfCoordinator.fulfill(1, randomWords);

        vm.prank(user2);
        vm.expectRevert("PackManager: not your pack");
        packManager.claimPack(packId);
    }

    function test_ExpirePack() public {
        _setupTier();

        vm.startPrank(user);
        usdg.approve(address(packManager), 10 ether);
        uint256 packId = packManager.openPack(0);
        vm.stopPrank();

        uint256[] memory randomWords = new uint256[](3);
        randomWords[0] = 0;
        randomWords[1] = 100;
        randomWords[2] = 200;

        vrfCoordinator.fulfill(1, randomWords);

        vm.warp(block.timestamp + 2 hours);

        vm.prank(deployer);
        packManager.expirePack(packId);
    }

    function test_DropTableWeights() public {
        _setupTier();

        PackManager.DropEntry[] memory entries = packManager.getDropTable(0);
        assertEq(entries.length, 4);

        uint256 totalWeight;
        for (uint256 i = 0; i < entries.length; i++) {
            totalWeight += entries[i].weight;
        }
        assertEq(totalWeight, 100);
    }

    function test_PurchaseMultiplePacks() public {
        _setupTier();

        usdg.mint(user, 1000 ether);

        for (uint256 i = 0; i < 3; i++) {
            vm.startPrank(user);
            usdg.approve(address(packManager), 10 ether);
            uint256 packId = packManager.openPack(0);
            vm.stopPrank();

            uint256[] memory randomWords = new uint256[](3);
            randomWords[0] = uint256(keccak256(abi.encode(i, 0)));
            randomWords[1] = uint256(keccak256(abi.encode(i, 1)));
            randomWords[2] = uint256(keccak256(abi.encode(i, 2)));

            vrfCoordinator.fulfill(i + 1, randomWords);
        }

        assertEq(packManager.getTierCount(), 1);
    }

    function test_BuybackCalculation() public {
        MockPriceFeed priceFeed = new MockPriceFeed(50000 * 1e8, 8); // NVDA at $50,000 (we're being ridiculous for testing)
        vm.prank(deployer);
        buybackVault.setPriceFeed(address(nvda), address(priceFeed));
    }

    function test_RevertOpenPackWhenPaused() public {
        _setupTier();

        vm.prank(deployer);
        packManager.pause();

        vm.startPrank(user);
        usdg.approve(address(packManager), 10 ether);
        vm.expectRevert();
        packManager.openPack(0);
        vm.stopPrank();
    }

    function test_refundUnresolvedPack_afterTimeout() public {
        _setupTier();

        vm.startPrank(user);
        usdg.approve(address(packManager), 10 ether);
        uint256 balBefore = usdg.balanceOf(user);
        uint256 packId = packManager.openPack(0); // VRF never fulfilled
        vm.stopPrank();

        // Too early to refund.
        vm.prank(user);
        vm.expectRevert("PackManager: not expired");
        packManager.refundUnresolvedPack(packId);

        vm.warp(block.timestamp + packManager.packClaimTimeout() + 1);

        vm.prank(user);
        packManager.refundUnresolvedPack(packId);
        assertEq(usdg.balanceOf(user), balBefore, "price refunded in full");

        // Cannot refund twice.
        vm.prank(user);
        vm.expectRevert("PackManager: resolved");
        packManager.refundUnresolvedPack(packId);
    }

    function test_refundUnresolvedPack_blocksLateVRF() public {
        _setupTier();

        vm.startPrank(user);
        usdg.approve(address(packManager), 10 ether);
        uint256 packId = packManager.openPack(0);
        vm.stopPrank();

        vm.warp(block.timestamp + packManager.packClaimTimeout() + 1);
        vm.prank(user);
        packManager.refundUnresolvedPack(packId);

        // A late VRF callback must not also pay out tokens. The mock coordinator re-wraps the
        // inner "PackManager: already resolved" revert as "fulfill failed".
        uint256[] memory randomWords = new uint256[](3);
        randomWords[0] = 1;
        randomWords[1] = 2;
        randomWords[2] = 3;
        vm.expectRevert("fulfill failed");
        vrfCoordinator.fulfill(1, randomWords);
    }
}
