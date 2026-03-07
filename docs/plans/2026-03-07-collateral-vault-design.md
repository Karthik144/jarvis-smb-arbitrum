# Collateral Vault Design Document

**Date:** 2026-03-07
**Status:** Approved
**Target:** Robinhood Testnet Deployment

## Overview

A standalone smart contract that enables users to deposit tokenized stocks (RWAs) as collateral and borrow USDC against them. This contract operates independently from the existing FedExEscrow contract, allowing users to obtain USDC liquidity from their tokenized stock holdings and use it for payments or other purposes.

## Problem Statement

SMB buyers may hold tokenized securities (stocks) on the Robinhood chain but need USDC liquidity for shipment payments. Traditional lending protocols require price oracles (Chainlink) which are unavailable on Robinhood testnet. This vault provides a simplified lending mechanism with hardcoded prices suitable for hackathon demonstration.

## Use Case

**Scenario:** Buyer holds tokenized TSLA and AAPL stocks on Robinhood testnet and needs USDC for a shipment payment.

**Flow:**
1. Buyer deposits tokenized stock (e.g., 5 TSLA tokens) into CollateralVault
2. Contract calculates collateral value using hardcoded prices (e.g., TSLA = $200)
3. Buyer borrows USDC up to 50% of collateral value (50% LTV)
4. Buyer uses borrowed USDC in FedExEscrow or elsewhere
5. Interest accrues at 10% APR based on time elapsed
6. Buyer repays principal + interest to unlock collateral
7. Buyer withdraws collateral tokens

## Architecture

### High-Level Design

**Contract Type:** Standalone lending vault

**Separation of Concerns:**
- CollateralVault handles: collateral deposits, USDC borrowing, interest calculation, repayment
- FedExEscrow handles: shipment-based split payments (unchanged)
- Users interact with CollateralVault first to obtain USDC, then use that USDC in FedExEscrow

**No Integration Required:**
- Contracts remain independent
- Cleaner architecture and easier testing
- Users manage workflow (get USDC from vault → use in escrow)

### Tech Stack

**Smart Contract:**
- Solidity 0.8.20+
- OpenZeppelin contracts: ReentrancyGuard, Ownable, SafeERC20
- Foundry for testing

**Deployment:**
- Robinhood testnet
- Requires USDC token address on Robinhood testnet
- Requires tokenized stock token addresses (available from faucet)

## Data Model

### State Variables

**Immutable:**
```solidity
IERC20 public immutable usdc;                    // USDC token contract
uint256 public constant COLLATERAL_RATIO = 50;   // 50% LTV
uint256 public constant INTEREST_RATE = 10;      // 10% APR
uint256 public constant SECONDS_PER_YEAR = 365 days;
```

**Mutable:**
```solidity
// Token address => Price in USD (6 decimals, matching USDC)
// Example: TSLA token => 200_000000 ($200.00)
mapping(address => uint256) public stockPrices;

// User => Position data
mapping(address => Position) public positions;

// User => Token => Amount deposited
mapping(address => mapping(address => uint256)) public collateralBalances;
```

### Data Structures

**Position Struct:**
```solidity
struct Position {
    uint256 totalBorrowed;      // Total USDC borrowed (principal)
    uint256 borrowTimestamp;    // Timestamp when borrow occurred
    bool hasActiveLoan;         // Whether user has outstanding debt
}
```

**Design Rationale:**
- Nested mapping for collateral allows multiple token types per user
- Single `totalBorrowed` assumes one active loan per user (simplifies MVP)
- `borrowTimestamp` enables time-based interest calculation
- `hasActiveLoan` flag prevents multiple simultaneous borrows

## Core Functionality

### 1. Deposit Collateral

**Function Signature:**
```solidity
function depositCollateral(address token, uint256 amount) external nonReentrant
```

**Logic:**
1. Validate token is supported (`stockPrices[token] > 0`)
2. Validate amount > 0
3. Transfer token from user via `safeTransferFrom`
4. Update `collateralBalances[msg.sender][token] += amount`
5. Emit `CollateralDeposited(user, token, amount)`

**User Can:**
- Deposit multiple types of tokens
- Deposit in multiple transactions
- Deposit even with active loan (adds to collateral)

### 2. Borrow USDC

**Function Signature:**
```solidity
function borrow(uint256 amount) external nonReentrant
```

**Logic:**
1. Validate user has no active loan
2. Validate amount > 0
3. Calculate total collateral value in USD:
   ```solidity
   for each token type:
       value += collateralBalances[user][token] * stockPrices[token]
   ```
4. Calculate borrowing power: `collateralValueUSD * COLLATERAL_RATIO / 100`
5. Validate borrowing power >= requested amount
6. Validate contract has sufficient USDC liquidity
7. Update position:
   - `totalBorrowed = amount`
   - `borrowTimestamp = block.timestamp`
   - `hasActiveLoan = true`
8. Transfer USDC to user
9. Emit `Borrowed(user, amount, timestamp)`

**Example:**
- User deposits 10 TSLA tokens (price = $200)
- Collateral value = 10 * $200 = $2,000
- Borrowing power = $2,000 * 50% = $1,000 USDC
- User can borrow up to 1,000 USDC

### 3. Repay Debt

**Function Signature:**
```solidity
function repay() external nonReentrant
```

**Logic:**
1. Validate user has active loan
2. Calculate interest owed:
   ```solidity
   timeElapsed = block.timestamp - borrowTimestamp
   interest = (totalBorrowed * INTEREST_RATE * timeElapsed) / (100 * SECONDS_PER_YEAR)
   ```
3. Calculate total debt: `totalBorrowed + interest`
4. Transfer total debt from user to contract via `safeTransferFrom`
5. Update position:
   - `totalBorrowed = 0`
   - `borrowTimestamp = 0`
   - `hasActiveLoan = false`
6. Emit `Repaid(user, principal, interest, totalDebt)`

**Notes:**
- Must repay full amount (no partial repayment for MVP)
- Interest calculated at repayment time (not continuously updated)
- User must approve contract to spend USDC before calling

### 4. Withdraw Collateral

**Function Signature:**
```solidity
function withdrawCollateral(address token, uint256 amount) external nonReentrant
```

**Logic:**
1. Validate user has no active loan (`!hasActiveLoan`)
2. Validate user has sufficient balance: `collateralBalances[msg.sender][token] >= amount`
3. Validate amount > 0
4. Update `collateralBalances[msg.sender][token] -= amount`
5. Transfer token to user via `safeTransfer`
6. Emit `CollateralWithdrawn(user, token, amount)`

**Notes:**
- Can only withdraw after full repayment
- Can withdraw specific tokens
- Can withdraw in multiple transactions (partial withdrawals)

## Interest Calculation

### Formula

```solidity
interest = (principal * INTEREST_RATE * timeElapsed) / (100 * SECONDS_PER_YEAR)
```

**Parameters:**
- `principal`: Amount borrowed in USDC (6 decimals)
- `INTEREST_RATE`: 10 (represents 10% APR)
- `timeElapsed`: `block.timestamp - borrowTimestamp` (seconds)
- `SECONDS_PER_YEAR`: 31,536,000 seconds (365 days)

### Example Calculation

**Scenario:**
- Borrowed: 1,000 USDC
- Time elapsed: 30 days (2,592,000 seconds)
- Interest rate: 10% APR

**Math:**
```
interest = (1,000_000000 * 10 * 2,592,000) / (100 * 31,536,000)
         = 25,920,000,000,000 / 3,153,600,000
         ≈ 8,219 (0.008219 USDC)
```

**For 1 Year:**
```
interest = (1,000_000000 * 10 * 31,536,000) / (100 * 31,536,000)
         = 100_000000 (100 USDC = 10% of principal)
```

### Implementation

```solidity
function calculateInterest(address user) public view returns (uint256) {
    Position memory pos = positions[user];

    if (!pos.hasActiveLoan || pos.totalBorrowed == 0) {
        return 0;
    }

    uint256 timeElapsed = block.timestamp - pos.borrowTimestamp;
    uint256 interest = (pos.totalBorrowed * INTEREST_RATE * timeElapsed)
                       / (100 * SECONDS_PER_YEAR);

    return interest;
}

function getTotalDebt(address user) public view returns (uint256) {
    Position memory pos = positions[user];
    if (!pos.hasActiveLoan) {
        return 0;
    }
    return pos.totalBorrowed + calculateInterest(user);
}
```

### Edge Cases

1. **Instant repayment** (timeElapsed = 0): Interest = 0
2. **Very small amounts**: Solidity rounds down, minimal interest
3. **Long periods**: Interest accumulates indefinitely (no cap)
4. **Precision**: Uses USDC's 6 decimal places throughout

## Helper View Functions

### getCollateralValue()

```solidity
function getCollateralValue(address user) public view returns (uint256)
```

**Purpose:** Calculate total USD value of user's deposited collateral

**Logic:**
```solidity
uint256 totalValue = 0;
for each supported token:
    if collateralBalances[user][token] > 0:
        totalValue += collateralBalances[user][token] * stockPrices[token] / 1e18
return totalValue;
```

**Note:** Token amounts are in 18 decimals (ERC20 standard), prices in 6 decimals (USDC)

### getBorrowingPower()

```solidity
function getBorrowingPower(address user) public view returns (uint256)
```

**Purpose:** Calculate how much USDC user can borrow

**Logic:**
```solidity
uint256 collateralValue = getCollateralValue(user);
return (collateralValue * COLLATERAL_RATIO) / 100;
```

### getPosition()

```solidity
function getPosition(address user) external view returns (
    uint256 totalBorrowed,
    uint256 currentInterest,
    uint256 totalDebt,
    uint256 collateralValue,
    uint256 borrowingPower,
    bool hasActiveLoan
)
```

**Purpose:** Return complete position information for frontend display

## Admin Functions

### setSupportedToken()

```solidity
function setSupportedToken(address token, uint256 priceUSD) external onlyOwner
```

**Purpose:** Add or update supported collateral token with hardcoded price

**Parameters:**
- `token`: ERC20 token address (e.g., tokenized TSLA)
- `priceUSD`: Price in USD with 6 decimals (e.g., 200_000000 for $200)

**Example:**
```solidity
setSupportedToken(tslaTokenAddress, 200_000000);  // $200.00
setSupportedToken(aaplTokenAddress, 150_000000);  // $150.00
```

### fundVault()

```solidity
function fundVault(uint256 amount) external onlyOwner
```

**Purpose:** Owner deposits USDC into vault for lending

**Note:** Required for vault to have USDC liquidity for borrowers

## Events

```solidity
event CollateralDeposited(address indexed user, address indexed token, uint256 amount);
event Borrowed(address indexed user, uint256 amount, uint256 timestamp);
event Repaid(address indexed user, uint256 principal, uint256 interest, uint256 totalRepaid);
event CollateralWithdrawn(address indexed user, address indexed token, uint256 amount);
event TokenPriceUpdated(address indexed token, uint256 newPrice);
event VaultFunded(address indexed owner, uint256 amount);
```

## Security Considerations

### Protections Implemented

1. **Reentrancy Guard:**
   - All state-changing functions use `nonReentrant` modifier
   - Follows checks-effects-interactions pattern

2. **Access Control:**
   - `Ownable` for admin functions (price updates, vault funding)
   - Users can only modify their own positions

3. **Overflow Protection:**
   - Solidity 0.8+ built-in overflow checks
   - SafeERC20 for secure token transfers

4. **Input Validation:**
   - All amounts must be > 0
   - Token addresses validated (must be supported)
   - Sufficient balance checks before transfers
   - Borrowing power validation

### Edge Cases Handled

1. **Insufficient collateral:** Borrow fails if borrowing power < amount
2. **Zero interest:** Instant repayment results in 0 interest (acceptable)
3. **Contract liquidity:** Borrow fails if contract lacks USDC
4. **Multiple collateral types:** Values aggregated correctly
5. **Partial withdrawals:** Supported after full repayment

### Known Limitations (MVP Scope)

1. **No liquidations:** Positions won't auto-liquidate if undercollateralized
2. **Single active loan:** Must repay fully before borrowing again
3. **No partial repayment:** Full debt must be repaid at once
4. **Fixed prices:** No oracle integration (manual price updates)
5. **Fixed interest rate:** 10% APR hardcoded (could make configurable)
6. **No pause mechanism:** Contract cannot be emergency-stopped

### Critical Validations

```solidity
// Token support
require(stockPrices[token] > 0, "Token not supported");

// Amount checks
require(amount > 0, "Amount must be > 0");

// Loan state
require(!positions[msg.sender].hasActiveLoan, "Active loan exists");
require(positions[msg.sender].hasActiveLoan, "No active loan");

// Collateral sufficiency
require(borrowingPower >= amount, "Insufficient collateral");

// Liquidity
require(usdc.balanceOf(address(this)) >= amount, "Insufficient liquidity");

// Balance checks
require(collateralBalances[msg.sender][token] >= amount, "Insufficient balance");
```

## Testing Strategy

### Key Test Scenarios

**1. Happy Path:**
- Deposit collateral → borrow USDC → time passes → repay with interest → withdraw collateral

**2. Collateral Management:**
- Deposit single token type
- Deposit multiple token types
- Verify collateral value calculation
- Cannot withdraw with active loan
- Can withdraw after repayment

**3. Borrowing:**
- Cannot borrow beyond 50% LTV
- Cannot borrow with active loan
- Cannot borrow if insufficient contract liquidity
- Borrowing power calculated correctly

**4. Interest Calculation:**
- Zero interest for instant repayment
- Correct interest after time elapses
- Interest grows linearly with time
- Interest scales with principal

**5. Repayment:**
- Cannot repay without active loan
- Must repay full amount (principal + interest)
- Position resets after repayment
- Can borrow again after repayment

**6. Edge Cases:**
- Deposit zero amount (fails)
- Borrow zero amount (fails)
- Deposit unsupported token (fails)
- Withdraw zero amount (fails)
- Withdraw more than balance (fails)

### Test Framework

**Foundry/Forge:**
- Matches existing project setup
- Fast execution
- Time manipulation via `vm.warp()`

**Mock Tokens:**
- Create mock ERC20 for collateral tokens
- Use existing USDC mock or deploy new one

**Critical Path:**
Complete flow must work: deposit → borrow → time elapses → repay → withdraw

## Deployment Checklist

**Prerequisites:**
1. USDC token address on Robinhood testnet
2. Tokenized stock addresses (TSLA, AAPL, etc. from faucet)
3. Deployer wallet funded with gas

**Deployment Steps:**
1. Deploy CollateralVault with USDC address
2. Call `setSupportedToken()` for each stock (TSLA=$200, AAPL=$150, etc.)
3. Call `fundVault()` to deposit initial USDC liquidity
4. Verify contract on block explorer (optional)
5. Test full flow with small amounts

**Post-Deployment:**
- Share contract address with frontend team (if applicable)
- Document supported tokens and prices
- Set up monitoring for contract USDC balance

## Success Criteria

Contract is successful when:

1. Users can deposit multiple types of collateral tokens
2. Collateral value calculated correctly using hardcoded prices
3. Users can borrow USDC up to 50% LTV
4. Interest accrues correctly at 10% APR
5. Users can repay principal + interest to unlock collateral
6. Users can withdraw collateral after repayment
7. All security validations work (no active loan for withdrawal, etc.)
8. Contract survives basic testing (happy path + edge cases)

## Integration with FedExEscrow

**No Direct Integration:**
- Contracts remain independent
- Users manage the workflow manually

**User Flow:**
1. Deposit collateral in CollateralVault
2. Borrow USDC from CollateralVault
3. Approve FedExEscrow to spend USDC
4. Create escrow payment in FedExEscrow
5. (After escrow completes) Repay CollateralVault
6. Withdraw collateral from CollateralVault

**Benefits:**
- Clean separation of concerns
- Each contract testable independently
- No circular dependencies
- Easier to audit and maintain

## Future Enhancements (Out of Scope)

1. **Oracle integration:** Replace hardcoded prices with Chainlink feeds
2. **Liquidations:** Auto-liquidate undercollateralized positions
3. **Partial repayment:** Allow paying down debt incrementally
4. **Multiple loans:** Track multiple simultaneous borrows per user
5. **Variable interest rates:** Dynamic rates based on utilization
6. **Governance:** Decentralize admin functions
7. **Pause mechanism:** Emergency stop functionality
8. **Flash loan protection:** Prevent same-block borrow/repay exploits

## Appendix: Constants Summary

```solidity
COLLATERAL_RATIO = 50        // 50% LTV
INTEREST_RATE = 10           // 10% APR
SECONDS_PER_YEAR = 31536000  // 365 days

// Example prices (set by owner)
TSLA = 200_000000  // $200.00 (6 decimals)
AAPL = 150_000000  // $150.00 (6 decimals)
```

## Notes

- Contract designed for Robinhood testnet deployment
- Prioritizes simplicity and demonstrability for hackathon
- Hardcoded prices acceptable given no oracle availability
- Single active loan per user simplifies MVP scope
- No liquidations acceptable for short-term demo
- Focus on clean, auditable code over feature completeness
