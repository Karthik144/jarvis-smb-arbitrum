# Jarvis
Jarvis automates stablecoin-based trade finance contracts via ZkTLS and offers sellers instant liquidity through a permissionless invoice factoring marketplace.

# Problem We're Solving
Interacting with trade finance is slow, costly, and riddled with trust problems. Internationally and domestically, businesses rely on third-party banks to post Letters of Credit (LC)—a process that delays payments by 7 to 21 days and adds unnecessary overhead. Jarvis replaces this with smart contract-powered escrow, using Zero-Knowledge TLS (ZkTLS) to privately and verifiably confirm FedEx package delivery and conditionally release stablecoins based on custom payment terms.

For sellers who can't wait for delivery, Jarvis offers a permissionless invoice factoring marketplace where lenders provide instant liquidity at a discount rate, earning yield when the invoice settles on delivery.

# How's it work?
1. **Create a Payment**: Buyer sets terms (upfront %, remaining %, seller address), locks USDC in escrow, and the upfront amount is immediately released to the seller.
2. **Verify Delivery with ZkTLS**: Seller scans a QR code that triggers Reclaim Protocol's ZkTLS flow on mobile—generating a zero-knowledge proof of FedEx delivery status without exposing sensitive tracking data.
3. **Release Remaining Funds**: The ZK proof is submitted on-chain to the FedExEscrow contract, which verifies it and releases the remaining escrowed amount to the seller.
4. **Optional — Factor the Invoice**: If the seller wants liquidity before delivery, they factor the invoice at a discount (5% or 10%), get paid immediately, and redirect the escrow payout to the lender on settlement.
5. **Lenders Earn Yield**: Lenders deposit funds at a chosen discount rate. When invoices they've funded are settled, they receive the full amount and pocket the spread.

# System Architecture

## Key Components:
- **FedExEscrow.sol** (Arbitrum Sepolia): Escrow contract that holds USDC, releases upfront immediately, and conditionally releases the remainder on ZK-verified delivery
- **InvoiceFactoring.sol** (Robinhood Testnet): Permissionless 1-to-1 lending marketplace for invoice factoring with tranche-based discount rates
- **ZkTLS via Reclaim Protocol**: Privately verifies FedEx package delivery on-chain without exposing raw tracking data
- **Supabase**: Off-chain state management for payments, lender positions, and factored invoices, with proof data stored alongside records
- **Privy**: Embedded wallet and user authentication for seamless onboarding
- **Next.js Frontend**: Three-role dashboard (Buyer / Seller / Lender) built with Next.js 16, React 19, and MUI

# Invoice Factoring Model

The factoring marketplace supports two discount tiers:

- **5% Discount (Low Risk)**: Seller receives 95% of invoice value immediately; lender earns 5% on settlement
- **10% Discount (High Risk)**: Seller receives 90% of invoice value immediately; lender earns 10% on settlement

Sellers choose their discount rate based on urgency and cost tolerance. Lenders set their discount rate when creating an offer and are matched automatically with factoring requests. Lender funds remain withdrawable until deployed into a factored invoice.

# Payment Lifecycle

1. **Escrow Created** — Buyer locks USDC; upfront amount released immediately to seller
2. **Pending Delivery** — Remaining funds held in escrow; seller awaits delivery
3. **ZK Proof Submitted** — Seller generates Reclaim ZkTLS proof of FedEx delivery on mobile
4. **Funds Released** — Smart contract verifies proof on-chain and releases remaining amount
5. **(Optional) Factored** — Seller factors invoice pre-delivery; lender advances discounted payout and is set as escrow beneficiary for settlement

# Future Improvements
- Expand ZkTLS integrations beyond FedEx to UPS, DHL, and other major carriers
- Add support for partial delivery verification (multi-shipment contracts)
- Plug into legacy trade finance platforms (e.g. TradeWindow, Bolero) as a verifiable data layer
- Introduce multi-lender tranche pools for larger invoice factoring needs
- Integrate additional stablecoins (USDT, DAI) and expand to mainnet deployments

# References
- **FedExEscrow Contract** (Arbitrum Sepolia): `0x04eA3BeCb7cb5895d3916900d931CaF1BcA02914`
- **InvoiceFactoring Contract** (Robinhood Testnet): `0x207CaC4B8B14Ef28a962B419959AA23fF94c2191`
- **USAT Contract** (Robinhood Testnet): `0x026671bE3F475c9003fc0eBc3d77e9FA44dA5f55`
- **Reclaim Protocol**: https://reclaimprotocol.org
- **Arbitrum Sepolia Chain ID**: 421614
- **Robinhood Testnet Chain ID**: 46630
