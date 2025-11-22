# PROJECT CONTEXT: SUI-FLASHBUILDER (HACKATHON 2024-2025)

## 1\. EXECUTIVE SUMMARY & VISION

**Project Name:** Sail
**Tagline:** The "Furucombo" of Sui – A No-Code DeFi Strategy Builder & Marketplace.
**Core Value Proposition:**

1.  **Democratization:** Allows non-coders to build complex Arbitrage and Flash Loan strategies via a Drag-and-Drop UI.
2.  **Safety:** Leverages Sui's "Atomic" Programmable Transaction Blocks (PTB). If a strategy fails to repay the loan, the transaction reverts automatically. Zero capital risk.
3.  **Monetization (The Twist):** A decentralized marketplace where traders encrypt their strategies (JSON) using **Seal**, store them on **Walrus**, and sell the decryption rights as NFTs.

-----

## 2\. MARKET ANALYSIS & OPPORTUNITY (WHY SUI?)

  * **The Gap:** Ethereum has Furucombo. Solana has Jupiter. Sui lacks a consumer-facing, no-code strategy builder. Existing tools (zktx.io, Scallop Tools) are IDEs for developers, not tools for traders.
  * **The Tech Advantage:**
      * **PTB (Programmable Transaction Blocks):** Capable of chaining up to 1024 commands (Borrow -\> Swap -\> Swap -\> Repay) in a *single* atomic transaction.
      * **Parallel Execution:** Perfect for high-frequency arbitrage without clogging the network.
      * **Object Model:** Strategies can be encapsulated as Objects/NFTs.

-----

## 3\. TECHNICAL ARCHITECTURE

### 3.1. The Engine (Client-Side PTB Builder)

The application does **not** rely on a central backend smart contract to execute strategies. Instead, the frontend constructs the transaction locally.

  * **Mechanism:** The UI generates a JSON representation of the strategy. The engine compiles this JSON into a Sui `TransactionBlock`.
  * **The "Hot Potato" Pattern:**
      * **Initiation:** The `borrow` function returns a `Coin<SUI>` and a `FlashReceipt` (Hot Potato).
      * **Constraint:** The Move verifier dictates that `FlashReceipt` *cannot* be dropped. It *must* be passed to the `repay` function in the same PTB.
      * **Implication:** The builder UI must visually force the user to connect the "Receipt" output of the Borrow Node to the "Receipt" input of the Repay Node.

### 3.2. The Marketplace (Walrus + Seal)

  * **Storage (Walrus):** We store the strategy logic (Coordinate of nodes, parameters, DEX routes) as a Blob on Walrus because storing large JSONs on-chain is expensive.
  * **Encryption (Seal):**
      * **Encryption:** Client-side encryption of the JSON using the Seal SDK.
      * **Access Policy:** A Move contract defines that "Only the holder of NFT X can decrypt Blob Y".
      * **Decryption:** When a buyer purchases the strategy (NFT), the Seal Network validates ownership on-chain and releases the decryption key to the buyer's browser.

-----

## 4\. INTEGRATION SPECS (SDKs & PROTOCOLS)

### 4.1. Lending & Flash Loans (Liquidity Sources)

| Protocol | NPM Package | Function: Borrow | Function: Repay | Returns (Hot Potato) |
| :--- | :--- | :--- | :--- | :--- |
| **Navi** | `@naviprotocol/lending` | `flash_loan_with_ctx` | `flash_repay_with_ctx` | `FlashLoanReceipt` |
| **Scallop** | `@scallop-io/sui-scallop-sdk` | `flash_loan` | `payback_loan` | `FlashLoanReceipt` |
| **DeepBook** | `@mysten/deepbook-v3` | `borrow_flashloan_base` | `return_flashloan_base` | `FlashLoan` |
| **Bucket** | `@bucket-protocol/sdk` | `flash_borrow_buck` | `repay_flash_loan` | `FlashReceipt` |

### 4.2. DEXs (Swap Execution)

  * **Cetus (CLMM):**
      * *SDK:* `@cetusprotocol/cetus-sui-clmm-sdk`
      * *Critical:* Must calculate `sqrt_price_limit` offline (via SDK simulation) to prevent high slippage or transaction failure.
  * **Turbos Finance:**
      * *SDK:* `turbos-clmm-sdk`
  * **Aftermath (Aggregator):**
      * *SDK:* `aftermath-ts-sdk`
      * *Use Case:* "Smart Swap" block that auto-routes to the best price if the user doesn't want to pick a specific DEX.

-----

## 5\. DATA STRUCTURES (JSON SCHEMAS)

### Strategy Definition (The "Save File")

```json
{
  "id": "uuid-v4",
  "meta": {
    "name": "SUI-USDC Arbitrage Loop",
    "author": "0xAddress...",
    "description": "Borrow SUI -> Buy USDC on Cetus -> Sell USDC on DeepBook -> Repay",
    "price_sui": 10
  },
  "nodes":
    },
    {
      "id": "node_2",
      "type": "DEX_SWAP",
      "protocol": "CETUS",
      "inputs": { "coin_in": "node_1.coin_loaned" },
      "params": { "pair": "SUI-USDC", "direction": "A2B" },
      "outputs": ["coin_swapped"]
    },
    {
      "id": "node_3",
      "type": "FLASH_REPAY",
      "protocol": "NAVI",
      "inputs": {
        "coin_repay": "node_2.coin_swapped",
        "receipt": "node_1.receipt_potato"
      }
    }
  ]
}
```

-----

## 6\. DEVELOPMENT STACK

  * **Language:** TypeScript (Frontend & Logic), Move (Marketplace Contract).
  * **Frontend Framework:** React (Vite/Next.js) + TailwindCSS.
  * **Visual Engine:** `React Flow` (for the Drag-and-Drop Canvas).
  * **Blockchain Interaction:** `@mysten/dapp-kit` (Hooks for wallet connection & signing).
  * **Storage/Encryption:** `@mysten/walrus`, `@mysten/seal`.

-----

## 7\. HACKATHON IMPLEMENTATION ROADMAP (48H)

**Phase 1: The Engine**

  * Setup repo with `@mysten/dapp-kit`.
  * Create `TransactionBuilder.ts`: A class that takes the JSON schema and outputs a valid Sui PTB.
  * Implement hardcoded test: Borrow 1 SUI from Navi -\> Repay 1 SUI to Navi. Verify it works on Testnet.

**Phase 2: The UI**

  * Install `React Flow`.
  * Create Custom Nodes: `BorrowNode`, `SwapNode`, `RepayNode`.
  * Implement "Handle Logic": Ensure users can only connect "Coin Output" to "Coin Input" and "Receipt Output" to "Receipt Input".

**Phase 3: The Logic**

  * Integrate Cetus SDK. Make a real swap happen inside the flash loan.
  * Add `DryRun` functionality: Use `suiClient.dryRunTransactionBlock()` to simulate profit/loss before the user signs.

**Phase 4: The Marketplace**

  * Integrate Walrus SDK to upload the JSON blob.
  * Integrate Seal SDK to encrypt the blob before upload.
  * Deploy a minimal Move contract (`marketplace.move`) to mint an NFT representing the license to decrypt.

-----

## 8\. PITCH & NARRATIVE KEYWORDS

  * **"Composability"**: We are the glue between Navi, Cetus, and DeepBook.
  * **"Atomic Arbitrage"**: Risk-free execution thanks to Sui's architecture.
  * **"Alpha Monetization"**: Turning knowledge (strategies) into an asset class (NFTs) using Seal/Walrus.
  * **"Serverless DeFi"**: No backend infrastructure required, everything runs in the client's browser and on-chain.

-----

## 9\. USEFUL COMMANDS & SNIPPETS

**Install dependencies:**

```bash
pnpm add @mysten/sui @mysten/dapp-kit @mysten/walrus @mysten/seal reactflow
pnpm add @naviprotocol/lending @cetusprotocol/cetus-sui-clmm-sdk
```

**PTB Construction Snippet (Conceptual):**

```typescript
const tx = new Transaction();
// 1. Borrow
const [coin, receipt] = await naviAdapter.borrow(tx, amount);
// 2. Swap (Coin passed as argument, not value)
const coinOut = await cetusAdapter.swap(tx, coin);
// 3. Repay (Must use the specific receipt object)
await naviAdapter.repay(tx, coinOut, receipt);
```