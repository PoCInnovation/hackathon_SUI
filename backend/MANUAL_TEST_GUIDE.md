# Manual Testing Guide for Sail Backend

This guide explains how to manually test a minimal flash loan on **Sui Mainnet**.

## 🛠 Prerequisites

1. **Node.js** (v18+)
2. **pnpm**
3. **Sui Wallet** (or any other Sui wallet)
   - Network: **Mainnet**
   - Balance: At least **0.1 SUI** (for gas + flash loan fee of 0.06%)

## 🚀 1. Start the API Server

Ensure the backend API is running in **Mainnet** mode.

```bash
cd backend
pnpm start:api
```

Expected output: `🚀 Server running on port 3000`

## 🔄 2. Test Flash Loan on Mainnet

### Minimal Flash Loan Strategy (Wallet-Funded)

This strategy performs a **minimal flash loan** on mainnet:
1. Borrows **0.01 SUI** (10,000,000 MIST) from Navi Protocol
2. Splits **0.001 SUI** (1,000,000 MIST) from your wallet's gas coin to pay the flash loan fee
3. Merges the borrowed amount with the fee
4. Repays the flash loan

**Total cost:** ~0.001 SUI for flash loan fee (0.06%) + gas fees (~0.0005 SUI) = **~0.0015 SUI total**

**Replace `YOUR_WALLET_ADDRESS` with your actual Sui wallet address:**

```bash
curl -X POST http://localhost:3000/api/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "0x3c7ea737b5f0390399892c70e899498f819e7593eabad27466acfc59fedb979d",
    "strategy": {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "version": "1.0.0",
      "meta": {
        "name": "Minimal Flash Loan Test (Mainnet)",
        "author": "0x3c7ea737b5f0390399892c70e899498f819e7593eabad27466acfc59fedb979d",
        "description": "Minimal flash loan funded by wallet",
        "created_at": 1700000000000,
        "updated_at": 1700000000000,
        "tags": ["test", "mainnet"]
      },
      "nodes": [
        {
          "id": "borrow_1",
          "type": "FLASH_BORROW",
          "protocol": "NAVI",
          "params": {
            "asset": "0x2::sui::SUI",
            "amount": "10000000"
          },
          "outputs": [
            { "id": "coin_borrowed", "type": "Coin<0x2::sui::SUI>", "output_type": "COIN" },
            { "id": "receipt", "type": "FlashLoanReceipt", "output_type": "RECEIPT" }
          ]
        },
        {
          "id": "split_gas",
          "type": "COIN_SPLIT",
          "protocol": "NATIVE",
          "params": {
            "amounts": ["1000000"]
          },
          "inputs": { "coin": "GAS" },
          "outputs": [
            { "id": "fee_coin", "type": "Coin<0x2::sui::SUI>", "output_type": "COIN" }
          ]
        },
        {
          "id": "merge_funds",
          "type": "COIN_MERGE",
          "protocol": "NATIVE",
          "params": {},
          "inputs": {
            "target_coin": "borrow_1.coin_borrowed",
            "merge_coins": ["split_gas.fee_coin"]
          },
          "outputs": [
            { "id": "merged_coin", "type": "Coin<0x2::sui::SUI>", "output_type": "COIN" }
          ]
        },
        {
          "id": "repay_1",
          "type": "FLASH_REPAY",
          "protocol": "NAVI",
          "params": {
            "asset": "0x2::sui::SUI"
          },
          "inputs": {
            "coin_repay": "merge_funds.merged_coin",
            "receipt": "borrow_1.receipt"
          }
        }
      ],
      "edges": [
        { "id": "e1", "source": "borrow_1", "source_output": "coin_borrowed", "target": "merge_funds", "target_input": "target_coin", "edge_type": "COIN", "coin_type": "0x2::sui::SUI" },
        { "id": "e2", "source": "split_gas", "source_output": "fee_coin", "target": "merge_funds", "target_input": "merge_coins", "edge_type": "COIN", "coin_type": "0x2::sui::SUI" },
        { "id": "e3", "source": "merge_funds", "source_output": "merged_coin", "target": "repay_1", "target_input": "coin_repay", "edge_type": "COIN", "coin_type": "0x2::sui::SUI" },
        { "id": "e4", "source": "borrow_1", "source_output": "receipt", "target": "repay_1", "target_input": "receipt", "edge_type": "RECEIPT" }
      ]
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "estimated_gas": 5000000,
  "estimated_profit_loss": [],
  "errors": [],
  "warnings": []
}
```

## 📊 Understanding the Results

### Success Response
If the simulation succeeds, you'll see:
- `success: true`
- `estimated_gas`: Total gas units needed (typically ~5-10M)
- No errors

### Flash Loan Fee Calculation
For a 0.01 SUI flash loan:
- Borrowed amount: 10,000,000 MIST (0.01 SUI)
- Fee (0.06%): 6,000 MIST (0.000006 SUI)
- Total to repay: 10,006,000 MIST
- You provide from wallet: 1,000,000 MIST (to cover fee + buffer)

## 💸 3. Execute on Mainnet (Real Transaction)

To execute this transaction on mainnet, you need to use your wallet. You have two options:

### Option A: Using the Frontend (Recommended)
1. Copy the strategy JSON from above
2. Use the frontend UI to import the strategy
3. Connect your Sui wallet
4. Click "Execute"
5. Sign the transaction in your wallet

### Option B: CLI Script (For Testing)

Create a file `backend/src/scripts/execute-mainnet-flashloan.ts`:

```typescript
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { TransactionBuilder } from "../core/transaction-builder";
import { Strategy } from "../types/strategy";

async function executeFlashLoan() {
  // 1. Setup Client & Signer
  const client = new SuiClient({ url: "https://fullnode.mainnet.sui.io:443" });

  // IMPORTANT: Store your private key securely! Never commit it to git
  const privateKey = process.env.PRIVATE_KEY; // Base64 encoded private key
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable not set");
  }

  const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  const sender = keypair.toSuiAddress();
  console.log("Sender address:", sender);

  // 2. Define the minimal flash loan strategy
  const strategy: Strategy = {
    id: "minimal-flashloan-mainnet",
    version: "1.0.0",
    meta: {
      name: "Minimal Flash Loan Test (Mainnet)",
      author: sender,
      description: "Minimal flash loan funded by wallet",
      created_at: Date.now(),
      updated_at: Date.now(),
      tags: ["test", "mainnet"]
    },
    nodes: [
      {
        id: "borrow_1",
        type: "FLASH_BORROW",
        protocol: "NAVI",
        params: { asset: "0x2::sui::SUI", amount: "10000000" },
        outputs: [
          { id: "coin_borrowed", type: "Coin<0x2::sui::SUI>", output_type: "COIN" },
          { id: "receipt", type: "FlashLoanReceipt", output_type: "RECEIPT" }
        ]
      },
      {
        id: "split_gas",
        type: "COIN_SPLIT",
        protocol: "NATIVE",
        params: { amounts: ["1000000"] },
        inputs: { coin: "GAS" },
        outputs: [
          { id: "fee_coin", type: "Coin<0x2::sui::SUI>", output_type: "COIN" }
        ]
      },
      {
        id: "merge_funds",
        type: "COIN_MERGE",
        protocol: "NATIVE",
        params: {},
        inputs: {
          target_coin: "borrow_1.coin_borrowed",
          merge_coins: ["split_gas.fee_coin"]
        },
        outputs: [
          { id: "merged_coin", type: "Coin<0x2::sui::SUI>", output_type: "COIN" }
        ]
      },
      {
        id: "repay_1",
        type: "FLASH_REPAY",
        protocol: "NAVI",
        params: { asset: "0x2::sui::SUI" },
        inputs: {
          coin_repay: "merge_funds.merged_coin",
          receipt: "borrow_1.receipt"
        }
      }
    ],
    edges: [
      { id: "e1", source: "borrow_1", source_output: "coin_borrowed", target: "merge_funds", target_input: "target_coin", edge_type: "COIN", coin_type: "0x2::sui::SUI" },
      { id: "e2", source: "split_gas", source_output: "fee_coin", target: "merge_funds", target_input: "merge_coins", edge_type: "COIN", coin_type: "0x2::sui::SUI" },
      { id: "e3", source: "merge_funds", source_output: "merged_coin", target: "repay_1", target_input: "coin_repay", edge_type: "COIN", coin_type: "0x2::sui::SUI" },
      { id: "e4", source: "borrow_1", source_output: "receipt", target: "repay_1", target_input: "receipt", edge_type: "RECEIPT" }
    ]
  };

  // 3. Build Transaction
  console.log("Building transaction...");
  const builder = new TransactionBuilder();
  const tx = await builder.buildFromStrategy(strategy);
  tx.setSender(sender);

  // 4. Execute on Mainnet
  console.log("Executing flash loan on mainnet...");
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showBalanceChanges: true,
      showObjectChanges: true,
    },
  });

  console.log("\n✅ Flash Loan Executed Successfully!");
  console.log("Transaction Digest:", result.digest);
  console.log("Gas Used:", result.effects?.gasUsed);
  console.log("Balance Changes:", result.balanceChanges);
  console.log("\nView on Explorer:");
  console.log(`https://suiscan.xyz/mainnet/tx/${result.digest}`);
}

executeFlashLoan().catch(console.error);
```

**Run the script:**
```bash
# Set your private key (base64 encoded)
export PRIVATE_KEY="your_base64_private_key_here"

# Execute
cd backend
pnpm tsx src/scripts/execute-mainnet-flashloan.ts
```

## ⚠️ Important Security Notes

1. **Never commit private keys** to version control
2. Use environment variables or secure key management
3. Test with minimal amounts first (0.01 SUI)
4. Always verify the transaction in the wallet before signing
5. Check your wallet balance before executing

## 🔍 4. Verify on Sui Explorer

After execution, check the transaction on [Suiscan](https://suiscan.xyz/mainnet):
- Look for the flash loan borrow and repay events
- Verify the gas costs
- Check the balance changes

## ⚠️ Common Issues

- **Insufficient Balance**: Ensure you have at least 0.1 SUI for gas + fees
- **Invalid Sender Address**: Make sure to replace `YOUR_WALLET_ADDRESS` with your actual address
- **Network Mismatch**: Verify you're connected to mainnet
- **Gas Estimation**: If simulation succeeds but execution fails, check gas price fluctuations
