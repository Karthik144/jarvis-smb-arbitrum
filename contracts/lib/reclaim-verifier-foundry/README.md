# Reclaim Protocol Verifier

Solidity smart contracts for verifying Reclaim Protocol proofs on-chain.

## Installation

```bash
git clone https://github.com/reclaimprotocol/reclaim-verifier-foundry.git
cd reclaim-verifier-foundry
forge install
```

## Build

```bash
forge build
```

## Test

```bash
forge test
```

## Deploy

```bash
export PRIVATE_KEY=0x...
export RPC_URL=...
forge script script/Reclaim.s.sol --rpc-url $RPC_URL --broadcast
```

## Usage

Install dependency:

```bash
forge install reclaimprotocol/reclaim-verifier-foundry
```

```solidity
import {Reclaim} from "reclaim-verifier-foundry/Reclaim.sol";

// Verify a proof
reclaim.verifyProof(proof);
```

## License

MIT
