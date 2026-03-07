# CollateralVault Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone lending vault that accepts tokenized stock collateral and lends USDC at 50% LTV with 10% APR interest.

**Architecture:** Single Solidity contract with OpenZeppelin dependencies (ReentrancyGuard, Ownable, SafeERC20). Uses hardcoded stock prices for MVP. No oracle integration. Follows TDD with Foundry tests.

**Tech Stack:** Solidity 0.8.20, OpenZeppelin Contracts, Foundry/Forge

---

## Task 1: Create Mock Contracts for Testing

**Files:**
- Create: `contracts/test/CollateralVault.t.sol`

**Step 1: Create test file with mock contracts**

Create the test file with MockUSDC (reuse pattern from FedExEscrow.t.sol) and MockERC20Token for collateral:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Mock USDC for testing
contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint8 public constant decimals = 6;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient balance");
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @dev Mock tokenized stock (ERC20 with 18 decimals)
contract MockStock {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint8 public constant decimals = 18;
    string public name;
    string public symbol;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient balance");
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract CollateralVaultTest is Test {
    CollateralVault public vault;
    MockUSDC public usdc;
    MockStock public tsla;
    MockStock public aapl;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);

    uint256 constant TSLA_PRICE = 200_000000; // $200 in 6 decimals
    uint256 constant AAPL_PRICE = 150_000000; // $150 in 6 decimals

    function setUp() public {
        // Deploy mocks
        usdc = new MockUSDC();
        tsla = new MockStock("Tesla Token", "TSLA");
        aapl = new MockStock("Apple Token", "AAPL");

        // Deploy vault - will update this as we build
        // vault = new CollateralVault(address(usdc));
    }
}
```

**Step 2: Verify file compiles**

Run: `cd contracts && forge build`

Expected: Build fails with "CollateralVault not found" (expected - we haven't created it yet)

**Step 3: Commit test scaffolding**

```bash
git add contracts/test/CollateralVault.t.sol
git commit -m "test: add CollateralVault test scaffolding with mocks"
```

---

## Task 2: Create Contract Structure with Constructor

**Files:**
- Create: `contracts/src/CollateralVault.sol`
- Modify: `contracts/test/CollateralVault.t.sol`

**Step 1: Write failing test for constructor**

Add to `CollateralVault.t.sol` after setUp():

```solidity
function test_Constructor() public {
    CollateralVault testVault = new CollateralVault(address(usdc));

    assertEq(address(testVault.usdc()), address(usdc));
    assertEq(testVault.COLLATERAL_RATIO(), 50);
    assertEq(testVault.INTEREST_RATE(), 10);
    assertEq(testVault.SECONDS_PER_YEAR(), 365 days);
    assertEq(testVault.owner(), address(this));
}

function test_ConstructorRevertsOnZeroAddress() public {
    vm.expectRevert("Invalid USDC address");
    new CollateralVault(address(0));
}
```

**Step 2: Run test to verify it fails**

Run: `cd contracts && forge test --match-test test_Constructor -vv`

Expected: FAIL with "CollateralVault not found"

**Step 3: Create minimal contract**

Create `contracts/src/CollateralVault.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CollateralVault
/// @notice Lending vault for borrowing USDC against tokenized stock collateral
/// @dev Uses hardcoded prices (no oracle) suitable for hackathon MVP
contract CollateralVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    IERC20 public immutable usdc;
    uint256 public constant COLLATERAL_RATIO = 50; // 50% LTV
    uint256 public constant INTEREST_RATE = 10; // 10% APR
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    struct Position {
        uint256 totalBorrowed;
        uint256 borrowTimestamp;
        bool hasActiveLoan;
    }

    // Token address => Price in USD (6 decimals)
    mapping(address => uint256) public stockPrices;

    // User => Position
    mapping(address => Position) public positions;

    // User => Token => Amount
    mapping(address => mapping(address => uint256)) public collateralBalances;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event CollateralDeposited(address indexed user, address indexed token, uint256 amount);
    event Borrowed(address indexed user, uint256 amount, uint256 timestamp);
    event Repaid(address indexed user, uint256 principal, uint256 interest, uint256 totalRepaid);
    event CollateralWithdrawn(address indexed user, address indexed token, uint256 amount);
    event TokenPriceUpdated(address indexed token, uint256 newPrice);
    event VaultFunded(address indexed funder, uint256 amount);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }
}
```

**Step 4: Update test setUp to deploy vault**

In `CollateralVault.t.sol`, update setUp():

```solidity
function setUp() public {
    // Deploy mocks
    usdc = new MockUSDC();
    tsla = new MockStock("Tesla Token", "TSLA");
    aapl = new MockStock("Apple Token", "AAPL");

    // Deploy vault
    vault = new CollateralVault(address(usdc));
}
```

**Step 5: Run test to verify it passes**

Run: `cd contracts && forge test --match-test test_Constructor -vv`

Expected: PASS (2 tests)

**Step 6: Commit**

```bash
git add contracts/src/CollateralVault.sol contracts/test/CollateralVault.t.sol
git commit -m "feat: add CollateralVault contract with constructor"
```

---

## Task 3: Implement Admin Function to Set Token Prices

**Files:**
- Modify: `contracts/src/CollateralVault.sol`
- Modify: `contracts/test/CollateralVault.t.sol`

**Step 1: Write failing tests**

Add to `CollateralVault.t.sol`:

```solidity
function test_SetSupportedToken() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    assertEq(vault.stockPrices(address(tsla)), TSLA_PRICE);
}

function test_SetSupportedTokenEmitsEvent() public {
    vm.expectEmit(true, false, false, true);
    emit CollateralVault.TokenPriceUpdated(address(tsla), TSLA_PRICE);

    vault.setSupportedToken(address(tsla), TSLA_PRICE);
}

function test_SetSupportedTokenOnlyOwner() public {
    vm.prank(user1);
    vm.expectRevert();
    vault.setSupportedToken(address(tsla), TSLA_PRICE);
}

function test_SetSupportedTokenRevertsOnZeroAddress() public {
    vm.expectRevert("Invalid token address");
    vault.setSupportedToken(address(0), TSLA_PRICE);
}

function test_SetSupportedTokenRevertsOnZeroPrice() public {
    vm.expectRevert("Price must be > 0");
    vault.setSupportedToken(address(tsla), 0);
}
```

**Step 2: Run tests to verify they fail**

Run: `cd contracts && forge test --match-test test_SetSupportedToken -vv`

Expected: FAIL with "setSupportedToken not found"

**Step 3: Implement setSupportedToken**

Add to `CollateralVault.sol` after constructor:

```solidity
// -------------------------------------------------------------------------
// Admin Functions
// -------------------------------------------------------------------------

/// @notice Set or update price for a supported collateral token
/// @param token ERC20 token address
/// @param priceUSD Price in USD with 6 decimals (e.g., 200_000000 = $200)
function setSupportedToken(address token, uint256 priceUSD) external onlyOwner {
    require(token != address(0), "Invalid token address");
    require(priceUSD > 0, "Price must be > 0");

    stockPrices[token] = priceUSD;
    emit TokenPriceUpdated(token, priceUSD);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd contracts && forge test --match-test test_SetSupportedToken -vv`

Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add contracts/src/CollateralVault.sol contracts/test/CollateralVault.t.sol
git commit -m "feat: add setSupportedToken admin function"
```

---

## Task 4: Implement Deposit Collateral Function

**Files:**
- Modify: `contracts/src/CollateralVault.sol`
- Modify: `contracts/test/CollateralVault.t.sol`

**Step 1: Write failing tests**

Add to `CollateralVault.t.sol`:

```solidity
function test_DepositCollateral() public {
    // Setup
    vault.setSupportedToken(address(tsla), TSLA_PRICE);
    uint256 amount = 10 ether; // 10 TSLA tokens

    tsla.mint(user1, amount);

    vm.startPrank(user1);
    tsla.approve(address(vault), amount);
    vault.depositCollateral(address(tsla), amount);
    vm.stopPrank();

    assertEq(vault.collateralBalances(user1, address(tsla)), amount);
    assertEq(tsla.balanceOf(address(vault)), amount);
    assertEq(tsla.balanceOf(user1), 0);
}

function test_DepositCollateralEmitsEvent() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);
    uint256 amount = 10 ether;

    tsla.mint(user1, amount);

    vm.startPrank(user1);
    tsla.approve(address(vault), amount);

    vm.expectEmit(true, true, false, true);
    emit CollateralVault.CollateralDeposited(user1, address(tsla), amount);

    vault.depositCollateral(address(tsla), amount);
    vm.stopPrank();
}

function test_DepositMultipleTokens() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);
    vault.setSupportedToken(address(aapl), AAPL_PRICE);

    uint256 tslaAmount = 10 ether;
    uint256 aaplAmount = 20 ether;

    tsla.mint(user1, tslaAmount);
    aapl.mint(user1, aaplAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), tslaAmount);
    aapl.approve(address(vault), aaplAmount);

    vault.depositCollateral(address(tsla), tslaAmount);
    vault.depositCollateral(address(aapl), aaplAmount);
    vm.stopPrank();

    assertEq(vault.collateralBalances(user1, address(tsla)), tslaAmount);
    assertEq(vault.collateralBalances(user1, address(aapl)), aaplAmount);
}

function test_DepositCollateralRevertsOnUnsupportedToken() public {
    uint256 amount = 10 ether;
    tsla.mint(user1, amount);

    vm.startPrank(user1);
    tsla.approve(address(vault), amount);

    vm.expectRevert("Token not supported");
    vault.depositCollateral(address(tsla), amount);
    vm.stopPrank();
}

function test_DepositCollateralRevertsOnZeroAmount() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    vm.prank(user1);
    vm.expectRevert("Amount must be > 0");
    vault.depositCollateral(address(tsla), 0);
}
```

**Step 2: Run tests to verify they fail**

Run: `cd contracts && forge test --match-test test_Deposit -vv`

Expected: FAIL with "depositCollateral not found"

**Step 3: Implement depositCollateral**

Add to `CollateralVault.sol` after admin functions:

```solidity
// -------------------------------------------------------------------------
// User Functions
// -------------------------------------------------------------------------

/// @notice Deposit collateral tokens into the vault
/// @param token ERC20 token address
/// @param amount Amount to deposit (in token's decimals)
function depositCollateral(address token, uint256 amount) external nonReentrant {
    require(stockPrices[token] > 0, "Token not supported");
    require(amount > 0, "Amount must be > 0");

    collateralBalances[msg.sender][token] += amount;

    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

    emit CollateralDeposited(msg.sender, token, amount);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd contracts && forge test --match-test test_Deposit -vv`

Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add contracts/src/CollateralVault.sol contracts/test/CollateralVault.t.sol
git commit -m "feat: add depositCollateral function"
```

---

## Task 5: Implement Helper View Functions for Collateral Value

**Files:**
- Modify: `contracts/src/CollateralVault.sol`
- Modify: `contracts/test/CollateralVault.t.sol`

**Step 1: Write failing tests**

Add to `CollateralVault.t.sol`:

```solidity
function test_GetCollateralValue() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);
    vault.setSupportedToken(address(aapl), AAPL_PRICE);

    // Deposit 10 TSLA ($200 each = $2000) and 20 AAPL ($150 each = $3000)
    uint256 tslaAmount = 10 ether;
    uint256 aaplAmount = 20 ether;

    tsla.mint(user1, tslaAmount);
    aapl.mint(user1, aaplAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), tslaAmount);
    aapl.approve(address(vault), aaplAmount);
    vault.depositCollateral(address(tsla), tslaAmount);
    vault.depositCollateral(address(aapl), aaplAmount);
    vm.stopPrank();

    // Expected: (10 * 200) + (20 * 150) = 2000 + 3000 = 5000 USDC
    uint256 expectedValue = 5000_000000;
    assertEq(vault.getCollateralValue(user1), expectedValue);
}

function test_GetCollateralValueWithNoDeposits() public {
    assertEq(vault.getCollateralValue(user1), 0);
}

function test_GetBorrowingPower() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 tslaAmount = 10 ether; // $2000 worth
    tsla.mint(user1, tslaAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), tslaAmount);
    vault.depositCollateral(address(tsla), tslaAmount);
    vm.stopPrank();

    // Expected: $2000 * 50% = $1000 USDC
    uint256 expectedPower = 1000_000000;
    assertEq(vault.getBorrowingPower(user1), expectedPower);
}
```

**Step 2: Run tests to verify they fail**

Run: `cd contracts && forge test --match-test test_GetCollateral -vv`

Expected: FAIL with "getCollateralValue not found"

**Step 3: Implement view functions**

Add to `CollateralVault.sol` at the end:

```solidity
// -------------------------------------------------------------------------
// View Functions
// -------------------------------------------------------------------------

/// @notice Calculate total USD value of user's collateral
/// @param user User address
/// @return Total collateral value in USD (6 decimals)
function getCollateralValue(address user) public view returns (uint256) {
    uint256 totalValue = 0;

    // Note: We need to track which tokens to iterate over
    // For MVP, we'll use a simple approach with getSupportedTokens array
    // For now, this is a limitation - we'll address in next task

    return totalValue;
}

/// @notice Calculate how much USDC user can borrow
/// @param user User address
/// @return Borrowing power in USDC (6 decimals)
function getBorrowingPower(address user) public view returns (uint256) {
    uint256 collateralValue = getCollateralValue(user);
    return (collateralValue * COLLATERAL_RATIO) / 100;
}
```

**Step 4: Realize we need supported tokens array**

We need to track which tokens a user has deposited. Add to state variables:

```solidity
// Array of all supported token addresses (for iteration)
address[] private supportedTokens;
mapping(address => bool) private isTokenSupported;

// User => array of tokens they've deposited
mapping(address => address[]) private userTokens;
mapping(address => mapping(address => bool)) private userHasToken;
```

Update `setSupportedToken`:

```solidity
function setSupportedToken(address token, uint256 priceUSD) external onlyOwner {
    require(token != address(0), "Invalid token address");
    require(priceUSD > 0, "Price must be > 0");

    if (!isTokenSupported[token]) {
        supportedTokens.push(token);
        isTokenSupported[token] = true;
    }

    stockPrices[token] = priceUSD;
    emit TokenPriceUpdated(token, priceUSD);
}
```

Update `depositCollateral`:

```solidity
function depositCollateral(address token, uint256 amount) external nonReentrant {
    require(stockPrices[token] > 0, "Token not supported");
    require(amount > 0, "Amount must be > 0");

    if (!userHasToken[msg.sender][token]) {
        userTokens[msg.sender].push(token);
        userHasToken[msg.sender][token] = true;
    }

    collateralBalances[msg.sender][token] += amount;

    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

    emit CollateralDeposited(msg.sender, token, amount);
}
```

Now implement `getCollateralValue` properly:

```solidity
function getCollateralValue(address user) public view returns (uint256) {
    uint256 totalValue = 0;
    address[] memory tokens = userTokens[user];

    for (uint256 i = 0; i < tokens.length; i++) {
        address token = tokens[i];
        uint256 balance = collateralBalances[user][token];
        if (balance > 0) {
            // Token has 18 decimals, price has 6 decimals
            // Result should be in 6 decimals (USDC)
            totalValue += (balance * stockPrices[token]) / 1e18;
        }
    }

    return totalValue;
}
```

**Step 5: Run tests to verify they pass**

Run: `cd contracts && forge test --match-test test_GetCollateral -vv`

Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add contracts/src/CollateralVault.sol contracts/test/CollateralVault.t.sol
git commit -m "feat: add view functions for collateral value and borrowing power"
```

---

## Task 6: Implement Borrow Function

**Files:**
- Modify: `contracts/src/CollateralVault.sol`
- Modify: `contracts/test/CollateralVault.t.sol`

**Step 1: Write failing tests**

Add to `CollateralVault.t.sol`:

```solidity
function test_Borrow() public {
    // Setup: deposit collateral
    vault.setSupportedToken(address(tsla), TSLA_PRICE);
    uint256 collateralAmount = 10 ether; // $2000 worth

    tsla.mint(user1, collateralAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);
    vm.stopPrank();

    // Fund vault with USDC
    uint256 vaultFunding = 10000_000000; // $10,000
    usdc.mint(address(vault), vaultFunding);

    // Borrow $1000 (50% of $2000)
    uint256 borrowAmount = 1000_000000;

    vm.prank(user1);
    vault.borrow(borrowAmount);

    (uint256 borrowed, uint256 timestamp, bool hasLoan) = vault.positions(user1);

    assertEq(borrowed, borrowAmount);
    assertEq(timestamp, block.timestamp);
    assertTrue(hasLoan);
    assertEq(usdc.balanceOf(user1), borrowAmount);
}

function test_BorrowEmitsEvent() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);
    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 1000_000000;

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), borrowAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);

    vm.expectEmit(true, false, false, true);
    emit CollateralVault.Borrowed(user1, borrowAmount, block.timestamp);

    vault.borrow(borrowAmount);
    vm.stopPrank();
}

function test_BorrowRevertsOnExistingLoan() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);
    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 500_000000;

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), 2000_000000);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);
    vault.borrow(borrowAmount);

    vm.expectRevert("Active loan exists");
    vault.borrow(borrowAmount);
    vm.stopPrank();
}

function test_BorrowRevertsOnInsufficientCollateral() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);
    uint256 collateralAmount = 10 ether; // $2000 worth, can borrow max $1000
    uint256 borrowAmount = 1500_000000; // Try to borrow $1500

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), borrowAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);

    vm.expectRevert("Insufficient collateral");
    vault.borrow(borrowAmount);
    vm.stopPrank();
}

function test_BorrowRevertsOnInsufficientLiquidity() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);
    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 1000_000000;

    tsla.mint(user1, collateralAmount);
    // Don't fund vault

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);

    vm.expectRevert("Insufficient liquidity");
    vault.borrow(borrowAmount);
    vm.stopPrank();
}

function test_BorrowRevertsOnZeroAmount() public {
    vm.prank(user1);
    vm.expectRevert("Amount must be > 0");
    vault.borrow(0);
}
```

**Step 2: Run tests to verify they fail**

Run: `cd contracts && forge test --match-test test_Borrow -vv`

Expected: FAIL with "borrow not found"

**Step 3: Implement borrow function**

Add to `CollateralVault.sol` after depositCollateral:

```solidity
/// @notice Borrow USDC against deposited collateral
/// @param amount Amount of USDC to borrow (6 decimals)
function borrow(uint256 amount) external nonReentrant {
    require(amount > 0, "Amount must be > 0");
    require(!positions[msg.sender].hasActiveLoan, "Active loan exists");

    uint256 borrowingPower = getBorrowingPower(msg.sender);
    require(borrowingPower >= amount, "Insufficient collateral");

    require(usdc.balanceOf(address(this)) >= amount, "Insufficient liquidity");

    positions[msg.sender] = Position({
        totalBorrowed: amount,
        borrowTimestamp: block.timestamp,
        hasActiveLoan: true
    });

    usdc.safeTransfer(msg.sender, amount);

    emit Borrowed(msg.sender, amount, block.timestamp);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd contracts && forge test --match-test test_Borrow -vv`

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add contracts/src/CollateralVault.sol contracts/test/CollateralVault.t.sol
git commit -m "feat: add borrow function"
```

---

## Task 7: Implement Interest Calculation Functions

**Files:**
- Modify: `contracts/src/CollateralVault.sol`
- Modify: `contracts/test/CollateralVault.t.sol`

**Step 1: Write failing tests**

Add to `CollateralVault.t.sol`:

```solidity
function test_CalculateInterestZeroTime() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    // Setup borrow
    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 1000_000000;

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), borrowAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);
    vault.borrow(borrowAmount);
    vm.stopPrank();

    // Immediate check - no time passed
    assertEq(vault.calculateInterest(user1), 0);
}

function test_CalculateInterestAfter30Days() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 1000_000000; // $1000

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), borrowAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);
    vault.borrow(borrowAmount);
    vm.stopPrank();

    // Fast forward 30 days
    vm.warp(block.timestamp + 30 days);

    // Expected interest: 1000 * 10% * (30/365) = ~8.219 USDC
    uint256 interest = vault.calculateInterest(user1);

    // Allow small rounding difference
    assertApproxEqAbs(interest, 8_219178, 1);
}

function test_CalculateInterestAfter1Year() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 1000_000000;

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), borrowAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);
    vault.borrow(borrowAmount);
    vm.stopPrank();

    // Fast forward 1 year
    vm.warp(block.timestamp + 365 days);

    // Expected: 1000 * 10% = 100 USDC
    assertEq(vault.calculateInterest(user1), 100_000000);
}

function test_CalculateInterestNoActiveLoan() public {
    assertEq(vault.calculateInterest(user1), 0);
}

function test_GetTotalDebt() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 1000_000000;

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), borrowAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);
    vault.borrow(borrowAmount);
    vm.stopPrank();

    // Fast forward 30 days
    vm.warp(block.timestamp + 30 days);

    uint256 interest = vault.calculateInterest(user1);
    uint256 totalDebt = vault.getTotalDebt(user1);

    assertEq(totalDebt, borrowAmount + interest);
}
```

**Step 2: Run tests to verify they fail**

Run: `cd contracts && forge test --match-test test_Calculate -vv`

Expected: FAIL with "calculateInterest not found"

**Step 3: Implement interest calculation functions**

Add to `CollateralVault.sol` view functions section:

```solidity
/// @notice Calculate accrued interest for a user's loan
/// @param user User address
/// @return Interest amount in USDC (6 decimals)
function calculateInterest(address user) public view returns (uint256) {
    Position memory pos = positions[user];

    if (!pos.hasActiveLoan || pos.totalBorrowed == 0) {
        return 0;
    }

    uint256 timeElapsed = block.timestamp - pos.borrowTimestamp;

    // interest = principal * rate * time / (100 * secondsPerYear)
    uint256 interest = (pos.totalBorrowed * INTEREST_RATE * timeElapsed)
                       / (100 * SECONDS_PER_YEAR);

    return interest;
}

/// @notice Get total debt (principal + interest) for a user
/// @param user User address
/// @return Total debt in USDC (6 decimals)
function getTotalDebt(address user) public view returns (uint256) {
    Position memory pos = positions[user];
    if (!pos.hasActiveLoan) {
        return 0;
    }
    return pos.totalBorrowed + calculateInterest(user);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd contracts && forge test --match-test test_Calculate -vv`

Expected: PASS (5 tests)

Run: `cd contracts && forge test --match-test test_GetTotalDebt -vv`

Expected: PASS (1 test)

**Step 5: Commit**

```bash
git add contracts/src/CollateralVault.sol contracts/test/CollateralVault.t.sol
git commit -m "feat: add interest calculation functions"
```

---

## Task 8: Implement Repay Function

**Files:**
- Modify: `contracts/src/CollateralVault.sol`
- Modify: `contracts/test/CollateralVault.t.sol`

**Step 1: Write failing tests**

Add to `CollateralVault.t.sol`:

```solidity
function test_Repay() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 1000_000000;

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), borrowAmount);

    // User borrows
    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);
    vault.borrow(borrowAmount);
    vm.stopPrank();

    // Fast forward 30 days
    vm.warp(block.timestamp + 30 days);

    uint256 totalDebt = vault.getTotalDebt(user1);

    // User repays
    usdc.mint(user1, totalDebt); // Give user enough to repay

    vm.startPrank(user1);
    usdc.approve(address(vault), totalDebt);
    vault.repay();
    vm.stopPrank();

    // Verify position cleared
    (uint256 borrowed, uint256 timestamp, bool hasLoan) = vault.positions(user1);
    assertEq(borrowed, 0);
    assertEq(timestamp, 0);
    assertFalse(hasLoan);

    // Verify USDC transferred
    assertEq(usdc.balanceOf(address(vault)), totalDebt);
}

function test_RepayEmitsEvent() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 1000_000000;

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), borrowAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);
    vault.borrow(borrowAmount);
    vm.stopPrank();

    vm.warp(block.timestamp + 30 days);

    uint256 interest = vault.calculateInterest(user1);
    uint256 totalDebt = borrowAmount + interest;

    usdc.mint(user1, totalDebt);

    vm.startPrank(user1);
    usdc.approve(address(vault), totalDebt);

    vm.expectEmit(true, false, false, true);
    emit CollateralVault.Repaid(user1, borrowAmount, interest, totalDebt);

    vault.repay();
    vm.stopPrank();
}

function test_RepayInstantlyNoInterest() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 1000_000000;

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), borrowAmount);
    usdc.mint(user1, borrowAmount); // For repayment

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);
    vault.borrow(borrowAmount);

    // Repay immediately (same block)
    usdc.approve(address(vault), borrowAmount);
    vault.repay();
    vm.stopPrank();

    // Verify position cleared
    (,, bool hasLoan) = vault.positions(user1);
    assertFalse(hasLoan);
}

function test_RepayRevertsOnNoActiveLoan() public {
    vm.prank(user1);
    vm.expectRevert("No active loan");
    vault.repay();
}

function test_CanBorrowAgainAfterRepay() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 500_000000;

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), 2000_000000);
    usdc.mint(user1, 1000_000000); // For repayment

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);

    // First borrow
    vault.borrow(borrowAmount);

    // Repay
    usdc.approve(address(vault), borrowAmount);
    vault.repay();

    // Second borrow should work
    vault.borrow(borrowAmount);
    vm.stopPrank();

    (uint256 borrowed,, bool hasLoan) = vault.positions(user1);
    assertEq(borrowed, borrowAmount);
    assertTrue(hasLoan);
}
```

**Step 2: Run tests to verify they fail**

Run: `cd contracts && forge test --match-test test_Repay -vv`

Expected: FAIL with "repay not found"

**Step 3: Implement repay function**

Add to `CollateralVault.sol` after borrow:

```solidity
/// @notice Repay loan (principal + interest) to unlock collateral
function repay() external nonReentrant {
    Position storage pos = positions[msg.sender];
    require(pos.hasActiveLoan, "No active loan");

    uint256 principal = pos.totalBorrowed;
    uint256 interest = calculateInterest(msg.sender);
    uint256 totalDebt = principal + interest;

    // Clear position
    pos.totalBorrowed = 0;
    pos.borrowTimestamp = 0;
    pos.hasActiveLoan = false;

    // Transfer payment from user
    usdc.safeTransferFrom(msg.sender, address(this), totalDebt);

    emit Repaid(msg.sender, principal, interest, totalDebt);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd contracts && forge test --match-test test_Repay -vv`

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add contracts/src/CollateralVault.sol contracts/test/CollateralVault.t.sol
git commit -m "feat: add repay function"
```

---

## Task 9: Implement Withdraw Collateral Function

**Files:**
- Modify: `contracts/src/CollateralVault.sol`
- Modify: `contracts/test/CollateralVault.t.sol`

**Step 1: Write failing tests**

Add to `CollateralVault.t.sol`:

```solidity
function test_WithdrawCollateral() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 collateralAmount = 10 ether;

    tsla.mint(user1, collateralAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);

    // Withdraw half
    uint256 withdrawAmount = 5 ether;
    vault.withdrawCollateral(address(tsla), withdrawAmount);
    vm.stopPrank();

    assertEq(vault.collateralBalances(user1, address(tsla)), 5 ether);
    assertEq(tsla.balanceOf(user1), withdrawAmount);
    assertEq(tsla.balanceOf(address(vault)), 5 ether);
}

function test_WithdrawCollateralEmitsEvent() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 amount = 10 ether;

    tsla.mint(user1, amount);

    vm.startPrank(user1);
    tsla.approve(address(vault), amount);
    vault.depositCollateral(address(tsla), amount);

    vm.expectEmit(true, true, false, true);
    emit CollateralVault.CollateralWithdrawn(user1, address(tsla), amount);

    vault.withdrawCollateral(address(tsla), amount);
    vm.stopPrank();
}

function test_WithdrawMultipleCollateralTypes() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);
    vault.setSupportedToken(address(aapl), AAPL_PRICE);

    uint256 tslaAmount = 10 ether;
    uint256 aaplAmount = 20 ether;

    tsla.mint(user1, tslaAmount);
    aapl.mint(user1, aaplAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), tslaAmount);
    aapl.approve(address(vault), aaplAmount);
    vault.depositCollateral(address(tsla), tslaAmount);
    vault.depositCollateral(address(aapl), aaplAmount);

    // Withdraw both
    vault.withdrawCollateral(address(tsla), tslaAmount);
    vault.withdrawCollateral(address(aapl), aaplAmount);
    vm.stopPrank();

    assertEq(tsla.balanceOf(user1), tslaAmount);
    assertEq(aapl.balanceOf(user1), aaplAmount);
}

function test_WithdrawCollateralRevertsWithActiveLoan() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 500_000000;

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), borrowAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);
    vault.borrow(borrowAmount);

    vm.expectRevert("Active loan exists");
    vault.withdrawCollateral(address(tsla), collateralAmount);
    vm.stopPrank();
}

function test_WithdrawCollateralRevertsOnInsufficientBalance() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 collateralAmount = 10 ether;

    tsla.mint(user1, collateralAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);

    vm.expectRevert("Insufficient balance");
    vault.withdrawCollateral(address(tsla), 15 ether);
    vm.stopPrank();
}

function test_WithdrawCollateralRevertsOnZeroAmount() public {
    vm.prank(user1);
    vm.expectRevert("Amount must be > 0");
    vault.withdrawCollateral(address(tsla), 0);
}

function test_FullFlowDepositBorrowRepayWithdraw() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 1000_000000;

    // Setup
    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), borrowAmount);

    vm.startPrank(user1);

    // 1. Deposit
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);

    // 2. Borrow
    vault.borrow(borrowAmount);
    assertEq(usdc.balanceOf(user1), borrowAmount);

    // 3. Wait and repay
    vm.warp(block.timestamp + 30 days);
    uint256 totalDebt = vault.getTotalDebt(user1);
    usdc.mint(user1, totalDebt);
    usdc.approve(address(vault), totalDebt);
    vault.repay();

    // 4. Withdraw
    vault.withdrawCollateral(address(tsla), collateralAmount);

    vm.stopPrank();

    // Verify final state
    assertEq(tsla.balanceOf(user1), collateralAmount);
    assertEq(vault.collateralBalances(user1, address(tsla)), 0);
    (,, bool hasLoan) = vault.positions(user1);
    assertFalse(hasLoan);
}
```

**Step 2: Run tests to verify they fail**

Run: `cd contracts && forge test --match-test test_Withdraw -vv`

Expected: FAIL with "withdrawCollateral not found"

**Step 3: Implement withdrawCollateral**

Add to `CollateralVault.sol` after repay:

```solidity
/// @notice Withdraw collateral tokens (only when no active loan)
/// @param token ERC20 token address
/// @param amount Amount to withdraw (in token's decimals)
function withdrawCollateral(address token, uint256 amount) external nonReentrant {
    require(amount > 0, "Amount must be > 0");
    require(!positions[msg.sender].hasActiveLoan, "Active loan exists");
    require(collateralBalances[msg.sender][token] >= amount, "Insufficient balance");

    collateralBalances[msg.sender][token] -= amount;

    IERC20(token).safeTransfer(msg.sender, amount);

    emit CollateralWithdrawn(msg.sender, token, amount);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd contracts && forge test --match-test test_Withdraw -vv`

Expected: PASS (7 tests)

Run: `cd contracts && forge test --match-test test_FullFlow -vv`

Expected: PASS (1 test)

**Step 5: Commit**

```bash
git add contracts/src/CollateralVault.sol contracts/test/CollateralVault.t.sol
git commit -m "feat: add withdrawCollateral function"
```

---

## Task 10: Add Vault Funding Function and Complete View Function

**Files:**
- Modify: `contracts/src/CollateralVault.sol`
- Modify: `contracts/test/CollateralVault.t.sol`

**Step 1: Write failing tests**

Add to `CollateralVault.t.sol`:

```solidity
function test_FundVault() public {
    uint256 amount = 10000_000000;
    usdc.mint(owner, amount);

    usdc.approve(address(vault), amount);
    vault.fundVault(amount);

    assertEq(usdc.balanceOf(address(vault)), amount);
}

function test_FundVaultEmitsEvent() public {
    uint256 amount = 10000_000000;
    usdc.mint(owner, amount);

    usdc.approve(address(vault), amount);

    vm.expectEmit(true, false, false, true);
    emit CollateralVault.VaultFunded(owner, amount);

    vault.fundVault(amount);
}

function test_FundVaultOnlyOwner() public {
    uint256 amount = 1000_000000;
    usdc.mint(user1, amount);

    vm.startPrank(user1);
    usdc.approve(address(vault), amount);

    vm.expectRevert();
    vault.fundVault(amount);
    vm.stopPrank();
}

function test_GetPosition() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 collateralAmount = 10 ether; // $2000
    uint256 borrowAmount = 1000_000000;

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), borrowAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);
    vault.borrow(borrowAmount);
    vm.stopPrank();

    vm.warp(block.timestamp + 30 days);

    (
        uint256 totalBorrowed,
        uint256 currentInterest,
        uint256 totalDebt,
        uint256 collateralValue,
        uint256 borrowingPower,
        bool hasActiveLoan
    ) = vault.getPosition(user1);

    assertEq(totalBorrowed, borrowAmount);
    assertGt(currentInterest, 0);
    assertEq(totalDebt, borrowAmount + currentInterest);
    assertEq(collateralValue, 2000_000000);
    assertEq(borrowingPower, 1000_000000);
    assertTrue(hasActiveLoan);
}
```

**Step 2: Run tests to verify they fail**

Run: `cd contracts && forge test --match-test test_FundVault -vv`

Expected: FAIL with "fundVault not found"

**Step 3: Implement fundVault and getPosition**

Add to `CollateralVault.sol` admin functions:

```solidity
/// @notice Owner funds the vault with USDC for lending
/// @param amount Amount of USDC to deposit (6 decimals)
function fundVault(uint256 amount) external onlyOwner {
    require(amount > 0, "Amount must be > 0");

    usdc.safeTransferFrom(msg.sender, address(this), amount);

    emit VaultFunded(msg.sender, amount);
}
```

Add to view functions:

```solidity
/// @notice Get complete position information for a user
/// @param user User address
/// @return totalBorrowed Principal borrowed
/// @return currentInterest Accrued interest
/// @return totalDebt Total debt (principal + interest)
/// @return collateralValue USD value of collateral
/// @return borrowingPower Maximum USDC user can borrow
/// @return hasActiveLoan Whether user has active loan
function getPosition(address user) external view returns (
    uint256 totalBorrowed,
    uint256 currentInterest,
    uint256 totalDebt,
    uint256 collateralValue,
    uint256 borrowingPower,
    bool hasActiveLoan
) {
    Position memory pos = positions[user];

    totalBorrowed = pos.totalBorrowed;
    currentInterest = calculateInterest(user);
    totalDebt = getTotalDebt(user);
    collateralValue = getCollateralValue(user);
    borrowingPower = getBorrowingPower(user);
    hasActiveLoan = pos.hasActiveLoan;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd contracts && forge test --match-test test_FundVault -vv`

Expected: PASS (3 tests)

Run: `cd contracts && forge test --match-test test_GetPosition -vv`

Expected: PASS (1 test)

**Step 5: Run all tests**

Run: `cd contracts && forge test -vv`

Expected: All tests pass

**Step 6: Commit**

```bash
git add contracts/src/CollateralVault.sol contracts/test/CollateralVault.t.sol
git commit -m "feat: add fundVault and getPosition functions"
```

---

## Task 11: Add NatSpec Documentation

**Files:**
- Modify: `contracts/src/CollateralVault.sol`

**Step 1: Add comprehensive NatSpec comments**

Update contract header and add missing documentation:

```solidity
/// @title CollateralVault
/// @notice Lending vault for borrowing USDC against tokenized stock collateral
/// @dev Uses hardcoded prices (no oracle) suitable for hackathon MVP
/// @dev Single active loan per user, 50% LTV, 10% APR simple interest
/// @custom:security-contact security@example.com (update as needed)
contract CollateralVault is ReentrancyGuard, Ownable {
```

Ensure all functions have proper NatSpec. Review each function and add:
- @notice for user-facing description
- @dev for implementation details
- @param for parameters
- @return for return values

**Step 2: Verify documentation**

Run: `cd contracts && forge doc`

Expected: Documentation generates without errors

**Step 3: Commit**

```bash
git add contracts/src/CollateralVault.sol
git commit -m "docs: add comprehensive NatSpec documentation"
```

---

## Task 12: Final Integration Tests and Edge Cases

**Files:**
- Modify: `contracts/test/CollateralVault.t.sol`

**Step 1: Add edge case tests**

Add remaining edge case tests:

```solidity
function test_MultipleUsersIndependentPositions() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    // User1 deposits and borrows
    uint256 collateral1 = 10 ether;
    uint256 borrow1 = 500_000000;

    tsla.mint(user1, collateral1);
    usdc.mint(address(vault), 2000_000000);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateral1);
    vault.depositCollateral(address(tsla), collateral1);
    vault.borrow(borrow1);
    vm.stopPrank();

    // User2 deposits and borrows
    uint256 collateral2 = 5 ether;
    uint256 borrow2 = 250_000000;

    tsla.mint(user2, collateral2);

    vm.startPrank(user2);
    tsla.approve(address(vault), collateral2);
    vault.depositCollateral(address(tsla), collateral2);
    vault.borrow(borrow2);
    vm.stopPrank();

    // Verify independent positions
    (uint256 borrowed1,,,,,) = vault.getPosition(user1);
    (uint256 borrowed2,,,,,) = vault.getPosition(user2);

    assertEq(borrowed1, borrow1);
    assertEq(borrowed2, borrow2);
}

function test_DepositAfterBorrow() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 initialCollateral = 10 ether;
    uint256 borrowAmount = 500_000000;

    tsla.mint(user1, initialCollateral + 5 ether);
    usdc.mint(address(vault), borrowAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), initialCollateral + 5 ether);
    vault.depositCollateral(address(tsla), initialCollateral);
    vault.borrow(borrowAmount);

    // Deposit more while loan is active (should work)
    vault.depositCollateral(address(tsla), 5 ether);
    vm.stopPrank();

    assertEq(vault.collateralBalances(user1, address(tsla)), 15 ether);
}

function test_BorrowMaximumWithMultipleTokens() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);
    vault.setSupportedToken(address(aapl), AAPL_PRICE);

    // 10 TSLA ($2000) + 10 AAPL ($1500) = $3500 total
    // Max borrow: $3500 * 50% = $1750
    uint256 tslaAmount = 10 ether;
    uint256 aaplAmount = 10 ether;
    uint256 maxBorrow = 1750_000000;

    tsla.mint(user1, tslaAmount);
    aapl.mint(user1, aaplAmount);
    usdc.mint(address(vault), maxBorrow);

    vm.startPrank(user1);
    tsla.approve(address(vault), tslaAmount);
    aapl.approve(address(vault), aaplAmount);
    vault.depositCollateral(address(tsla), tslaAmount);
    vault.depositCollateral(address(aapl), aaplAmount);

    vault.borrow(maxBorrow);
    vm.stopPrank();

    assertEq(usdc.balanceOf(user1), maxBorrow);
}

function test_InterestDoesNotAccrueAfterRepay() public {
    vault.setSupportedToken(address(tsla), TSLA_PRICE);

    uint256 collateralAmount = 10 ether;
    uint256 borrowAmount = 1000_000000;

    tsla.mint(user1, collateralAmount);
    usdc.mint(address(vault), borrowAmount);

    vm.startPrank(user1);
    tsla.approve(address(vault), collateralAmount);
    vault.depositCollateral(address(tsla), collateralAmount);
    vault.borrow(borrowAmount);
    vm.stopPrank();

    // Repay immediately
    vm.prank(user1);
    usdc.approve(address(vault), borrowAmount);
    vm.prank(user1);
    vault.repay();

    // Wait time
    vm.warp(block.timestamp + 365 days);

    // Interest should be 0
    assertEq(vault.calculateInterest(user1), 0);
    assertEq(vault.getTotalDebt(user1), 0);
}
```

**Step 2: Run all tests**

Run: `cd contracts && forge test -vv`

Expected: All tests pass

**Step 3: Run with gas report**

Run: `cd contracts && forge test --gas-report`

Expected: Gas report shows reasonable costs

**Step 4: Commit**

```bash
git add contracts/test/CollateralVault.t.sol
git commit -m "test: add comprehensive edge case tests"
```

---

## Task 13: Create Deployment Script (Optional but Recommended)

**Files:**
- Create: `contracts/script/DeployCollateralVault.s.sol`

**Step 1: Create deployment script**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CollateralVault} from "../src/CollateralVault.sol";

contract DeployCollateralVault is Script {
    function run() external returns (CollateralVault) {
        // Get USDC address from environment or use hardcoded testnet address
        address usdcAddress = vm.envOr("USDC_ADDRESS", address(0));
        require(usdcAddress != address(0), "USDC_ADDRESS not set");

        vm.startBroadcast();

        CollateralVault vault = new CollateralVault(usdcAddress);

        console.log("CollateralVault deployed at:", address(vault));

        vm.stopBroadcast();

        return vault;
    }
}
```

**Step 2: Test deployment script locally**

Run: `cd contracts && forge script script/DeployCollateralVault.s.sol -vvv`

Expected: Script runs successfully (will fail without USDC_ADDRESS, which is expected)

**Step 3: Commit**

```bash
git add contracts/script/DeployCollateralVault.s.sol
git commit -m "chore: add deployment script for CollateralVault"
```

---

## Task 14: Create README Documentation

**Files:**
- Create: `contracts/README-CollateralVault.md`

**Step 1: Write comprehensive README**

```markdown
# CollateralVault

Standalone lending vault for borrowing USDC against tokenized stock collateral on Robinhood testnet.

## Overview

CollateralVault allows users to:
1. Deposit tokenized stocks (RWAs) as collateral
2. Borrow USDC up to 50% LTV (Loan-to-Value)
3. Accrue interest at 10% APR (simple interest)
4. Repay principal + interest to unlock collateral
5. Withdraw collateral after full repayment

## Key Features

- **Multi-token collateral**: Deposit multiple types of tokenized stocks
- **Hardcoded prices**: No oracle dependency (suitable for MVP)
- **Simple interest**: 10% APR calculated on borrowed amount
- **Single active loan**: Must repay fully before borrowing again
- **Owner-managed**: Contract owner sets token prices and funds vault

## Contract Constants

- `COLLATERAL_RATIO`: 50 (50% LTV)
- `INTEREST_RATE`: 10 (10% APR)
- `SECONDS_PER_YEAR`: 31,536,000 (365 days)

## Usage

### Setup (Owner)

1. Deploy contract with USDC address
2. Set supported tokens and prices:
   ```solidity
   vault.setSupportedToken(tslaAddress, 200_000000); // $200
   vault.setSupportedToken(aaplAddress, 150_000000); // $150
   ```
3. Fund vault with USDC:
   ```solidity
   usdc.approve(vaultAddress, amount);
   vault.fundVault(amount);
   ```

### User Flow

1. **Deposit Collateral**
   ```solidity
   tsla.approve(vaultAddress, amount);
   vault.depositCollateral(tslaAddress, amount);
   ```

2. **Borrow USDC**
   ```solidity
   uint256 borrowAmount = vault.getBorrowingPower(userAddress);
   vault.borrow(borrowAmount);
   ```

3. **Check Debt**
   ```solidity
   uint256 debt = vault.getTotalDebt(userAddress);
   ```

4. **Repay Loan**
   ```solidity
   uint256 debt = vault.getTotalDebt(userAddress);
   usdc.approve(vaultAddress, debt);
   vault.repay();
   ```

5. **Withdraw Collateral**
   ```solidity
   vault.withdrawCollateral(tslaAddress, amount);
   ```

## Interest Calculation

Interest accrues based on time elapsed:

```
interest = (principal * INTEREST_RATE * timeElapsed) / (100 * SECONDS_PER_YEAR)
```

**Example**: Borrow $1,000 USDC for 30 days
- Interest = (1000 * 10 * 2,592,000) / (100 * 31,536,000)
- Interest ≈ 8.22 USDC

## Testing

Run all tests:
```bash
cd contracts
forge test -vv
```

Run with gas report:
```bash
forge test --gas-report
```

## Deployment

Set environment variables:
```bash
export USDC_ADDRESS=<robinhood-testnet-usdc-address>
export PRIVATE_KEY=<your-private-key>
export RPC_URL=<robinhood-testnet-rpc>
```

Deploy:
```bash
forge script script/DeployCollateralVault.s.sol --rpc-url $RPC_URL --broadcast --verify
```

## Security Considerations

**Implemented:**
- Reentrancy protection (ReentrancyGuard)
- Owner-only admin functions (Ownable)
- SafeERC20 for token transfers
- Input validation on all functions
- Overflow protection (Solidity 0.8+)

**Known Limitations (MVP Scope):**
- No liquidations for undercollateralized positions
- Single active loan per user
- No partial repayment
- Hardcoded prices (no oracle)
- No pause mechanism

## License

MIT
```

**Step 2: Commit**

```bash
git add contracts/README-CollateralVault.md
git commit -m "docs: add CollateralVault README"
```

---

## Final Checks

**Step 1: Run full test suite**

Run: `cd contracts && forge test -vv`

Expected: All tests pass

**Step 2: Check code coverage (optional)**

Run: `cd contracts && forge coverage`

Expected: High coverage on CollateralVault.sol

**Step 3: Build contracts**

Run: `cd contracts && forge build`

Expected: Build succeeds with no warnings

**Step 4: Format code**

Run: `cd contracts && forge fmt`

Expected: Code formatted consistently

**Step 5: Final commit**

```bash
git add .
git commit -m "chore: format code and finalize CollateralVault implementation"
```

---

## Success Criteria

Implementation is complete when:

1. ✅ All tests pass (`forge test`)
2. ✅ Contract compiles without warnings (`forge build`)
3. ✅ Core functions work: deposit, borrow, repay, withdraw
4. ✅ Interest calculates correctly over time
5. ✅ View functions return accurate data
6. ✅ Admin functions properly restricted
7. ✅ Edge cases handled (insufficient collateral, no active loan, etc.)
8. ✅ Documentation complete (NatSpec + README)
9. ✅ Deployment script ready
10. ✅ Code follows Solidity best practices

## Notes

- Follow TDD strictly: write test → run (fail) → implement → run (pass) → commit
- Each task should take 5-15 minutes
- Commit frequently with descriptive messages
- Reference design doc for implementation details
- Test with `forge test -vv` for verbose output
- Use `vm.warp()` for time manipulation in tests
- Mock contracts keep tests fast (no forking needed)
