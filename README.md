# ⚡ SAIL - Sui Automated Investment Lab

[![Sui Network](https://img.shields.io/badge/Sui-Network-blue?style=flat-square)](https://sui.io/)
[![Testnet](https://img.shields.io/badge/Network-Testnet%20%2B%20Mainnet-green?style=flat-square)](https://sui.io/)

**SAIL** is a revolutionary **No-Code DeFi Strategy Builder** on the Sui blockchain. It empowers anyone to **build, visualize, simulate, and execute complex strategies including Flash Loans** through an intuitive interface—**without writing a single line of Move code**.

Beyond being an execution platform, SAIL is also a **Strategy Marketplace** where creators (MEV searchers, traders) can encrypt their strategies using **Seal** and **Walrus**, then sell them securely to other users.

---

## 🚀 Why SAIL?

On Ethereum, Flash Loans are reserved for expert Solidity developers. On Sui, thanks to **Programmable Transaction Blocks (PTB)**, they become accessible to everyone.

### Problems Solved

| Problem | Solution |
|---------|----------|
| Technical complexity of Hot Potato pattern | UI automatically handles atomic borrow/repay |
| Inability to monetize alpha strategies | Secure encryption & sale via Seal + Walrus |
| Risk of loss on failed strategies | Automatic transaction rollback (PTB atomicity) |
| Limited protocol support | Multi-protocol integration with custom block support |
| Network fragmentation | Hybrid network support (Testnet marketplace + Mainnet execution) |

---

## 🏗️ Architecture

### 1. PTB Engine (Client-Side)

No central smart contract required. Users assemble a single atomic transaction client-side with all DeFi actions.

- **Input**: JSON strategy definition
- **Output**: Atomic PTB sent on-chain
- **Security**: Hot Potato pattern enforces mandatory repayment

### 2. DeFi Integrations

**Flash Loans**
- **Navi Protocol** - Primary flash loan provider

**DEX Swaps**
- **Cetus** - Concentrated liquidity swaps via CLMM SDK
- **Turbos Finance** - Custom block integration for advanced swaps

**Custom Blocks**
- Support for arbitrary Move calls
- Type-safe argument handling
- Automatic dependency resolution via topological sorting

### 3. Storage & Privacy

| Technology | Usage |
|------------|-------|
| Walrus | Immutable storage for encrypted strategy JSON blobs |
| Seal | Encryption and NFT-based access control |
| Move Whitelist Contract | On-chain access management for marketplace |

### 4. Hybrid Network Architecture

SAIL operates on **two networks simultaneously**:

- **Testnet**: Marketplace, whitelist payments, strategy publishing
- **Mainnet**: Strategy execution, real DeFi operations

The frontend automatically prompts users to switch networks based on the action.

---

## 🛠️ Tech Stack

**Frontend**
- React 19, TypeScript, Next.js 16
- TailwindCSS v4
- Framer Motion (animations)
- Material-UI (components)
- Lucide React (icons)

**Blockchain Interaction**
- `@mysten/dapp-kit` - Wallet integration
- `@mysten/sui` - PTB construction
- `@mysten/seal` - Encryption/decryption

**DeFi SDKs**
- `navi-sdk` - Flash loans
- `@cetusprotocol/cetus-sui-clmm-sdk` - DEX swaps

**Backend**
- Node.js + Express
- TypeScript
- Walrus SDK (storage)
- Seal SDK (encryption)

**Move Contracts**
- Whitelist management module
- Access control for marketplace

---

## 📦 Installation & Setup

### Prerequisites

- Node.js ≥ 18
- pnpm (recommended)
- Sui Wallet
- Testnet + Mainnet funds

### Installation

```bash
git clone <repo-url>
cd hackathon_SUI
pnpm install
```

### Configuration

#### Backend (.env)

Create `backend/.env`:

```env
# Move Package Configuration
PACKAGE_ID=<your-package-id>
WHITELIST_ID=<your-whitelist-object-id>
CAP_ID=<your-admin-cap-id>
ADMIN_PRIVATE_KEY=<admin-private-key>

# Walrus Configuration
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space

# API Configuration
PORT=8000
```

### Launch

**Backend:**
```bash
cd backend
pnpm start:api
```

**Frontend:**
```bash
cd frontend
pnpm run dev
```

Access the app at: `http://localhost:3000`

---

## 💡 User Guide

### 1️⃣ Building a Strategy

1. Navigate to the **Builder** section
2. Add nodes from the sidebar:
   - **Flash Borrow** (Navi Protocol)
   - **DEX Swap** (Cetus)
   - **Custom Block** (anything)
   - **Coin Operations** (Merge/Split)
   - **Flash Repay** (Navi Protocol)
3. Connect nodes by defining edges in the JSON
4. Configure each node's parameters
5. **Critical**: Connect the loan receipt to the repay node (Hot Potato pattern)

### 2️⃣ Simulating

1. Click "Execute Simulation"
2. The system performs a `dryRun` on Mainnet
3. View results:
   - Estimated gas cost
   - Profit/loss calculation
   - Execution errors (if any)

### 3️⃣ Publishing to Marketplace

1. Click "Publish to Marketplace"
2. Set name, description, price, and tags
3. Strategy is encrypted with Seal
4. Uploaded to Walrus for immutable storage
5. Listed in the marketplace

### 4️⃣ Purchasing Strategies

1. Navigate to **Marketplace**
2. Pay 0.5 SUI to join the whitelist (one-time, Testnet)
3. Browse available strategies
4. Purchase and decrypt strategies
5. Execute them from your **Templates** section

### 5️⃣ Executing Strategies

1. Go to **Templates** section
2. Select a strategy
3. Click "Run Strategy"
4. Wallet prompts to switch to **Mainnet**
5. Sign and execute the transaction
6. View results in **History**

---

## 🎯 Key Features

### Strategy Builder
- JSON-based strategy definition
- Real-time validation
- Automatic dependency resolution via topological sort
- Type-safe node connections

### Multi-Protocol Support
- **Navi Protocol**: Flash loans with flexible repayment
- **Cetus**: Concentrated liquidity swaps
- **Turbos Finance**: Custom block integration
- Extensible adapter system for new protocols

### Custom Blocks
- Define arbitrary Move calls
- Support for complex type arguments
- Vector construction (`make_vec`)
- Shared object references
- Multiple outputs with destructuring

### Marketplace
- Encrypted strategy storage (Seal + Walrus)
- Whitelist-based access control
- On-chain verification
- Decentralized storage

### Simulation Engine
- Pre-execution dry runs
- Gas estimation
- Profit/loss calculation
- Error detection and reporting

### Execution History
- Complete transaction logs
- Step-by-step execution tracking
- Success/failure analytics
- SuiScan integration

---

## 🔧 Advanced: Custom Blocks

SAIL supports custom Move calls for advanced users. Example Turbos swap:

```json
{
  "id": "turbos_swap",
  "type": "CUSTOM",
  "protocol": "CUSTOM",
  "params": {
    "target": "0xd02012c71c1a6a221e540c36c37c81e0224907fe1ee05bfe250025654ff17103::swap_router::swap_a_b_with_return_",
    "arguments": [
      { "type": "object", "object_id": "0x5eb2..." },
      { "type": "make_vec", "input_ref": "borrow_1.coin_borrowed", "value_type": "0x2::coin::Coin<0x2::sui::SUI>" },
      { "type": "pure", "value": "100000", "value_type": "u64" }
    ],
    "type_arguments": ["0x2::sui::SUI", "0x5d4b...::coin::COIN", "0x91bf...::fee3000bps::FEE3000BPS"]
  },
  "inputs": { "coin_in": "borrow_1.coin_borrowed" },
  "outputs": [
    { "id": "usdc_out", "type": "Coin<USDC>", "output_type": "COIN" },
    { "id": "sui_remainder", "type": "Coin<SUI>", "output_type": "COIN" }
  ]
}
```

**Key Points:**
- Custom blocks must declare `inputs` and `outputs` for proper topological sorting
- Type arguments must match the Move function signature exactly
- Use `Coin<T>` wrapper types for `public_transfer` calls
- Edges must connect outputs to inputs for dependency tracking

---

## 📜 License

Distributed under the **MIT License**.

---

## 🏆 Hackathon

💙 Built with passion during the **Sui Hackathon**

**Team**: PoCInnovation

**Technologies**: Sui, Walrus, Seal, Navi Protocol, Cetus, Turbos Finance
