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

  // 2. Define strategies
  const minimalStrategy: Strategy = {
    id: "123e4567-e89b-12d3-a456-426614174001",
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

  const arbitrageStrategy: Strategy = {
    id: "123e4567-e89b-12d3-a456-426614174001",
    version: "1.0.0",
    meta: {
      name: "SUI-USDC-SUI Arbitrage Test",
      author: sender,
      description: "Flash loan with Cetus swap arbitrage",
      created_at: Date.now(),
      updated_at: Date.now(),
      tags: ["test", "arbitrage", "mainnet"]
    },
    nodes: [
      {
        id: "borrow_1",
        type: "FLASH_BORROW",
        protocol: "NAVI",
        params: {
          asset: "0x2::sui::SUI",
          amount: "1000000000"
        },
        "outputs": [
          { "id": "coin_borrowed", "type": "Coin<0x2::sui::SUI>", "output_type": "COIN" },
          { "id": "receipt", "type": "FlashLoanReceipt", "output_type": "RECEIPT" }
        ]
      },
      {
        id: "swap_1",
        type: "DEX_SWAP",
        protocol: "CETUS",
        params: {
          pool_id: "0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630",
          coin_type_a: "0x2::sui::SUI",
          coin_type_b: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
          direction: "A_TO_B",
          amount_mode: "EXACT_IN",
          amount: "1000000000",
          slippage_tolerance: "0.01"
        },
        inputs: { "coin_in": "borrow_1.coin_borrowed" },
        outputs: [
          { "id": "usdc_coin", "type": "Coin<USDC>", "output_type": "COIN" }
        ]
      },
      {
        id: "swap_2",
        type: "DEX_SWAP",
        protocol: "CETUS",
        params: {
          pool_id: "0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630",
          coin_type_a: "0x2::sui::SUI",
          coin_type_b: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
          direction: "B_TO_A",
          amount_mode: "EXACT_IN",
          amount: "ALL",
          slippage_tolerance: "0.01"
        },
        inputs: { "coin_in": "swap_1.usdc_coin" },
        outputs: [
          { "id": "sui_coin_swapped", "type": "Coin<0x2::sui::SUI>", "output_type": "COIN" }
        ]
      },
      {
        id: "split_gas",
        type: "COIN_SPLIT",
        protocol: "NATIVE",
        params: {
          amounts: ["10000000"]
        },
        inputs: { "coin": "GAS" },
        outputs: [
          { "id": "fee_coin", "type": "Coin<0x2::sui::SUI>", "output_type": "COIN" }
        ]
      },
      {
        id: "merge_funds",
        type: "COIN_MERGE",
        protocol: "NATIVE",
        params: {},
        inputs: {
          target_coin: "swap_2.sui_coin_swapped",
          merge_coins: ["split_gas.fee_coin"]
        },
        outputs: [
          { "id": "merged_coin", "type": "Coin<0x2::sui::SUI>", "output_type": "COIN" }
        ]
      },
      {
        id: "repay_1",
        type: "FLASH_REPAY",
        protocol: "NAVI",
        params: {
          asset: "0x2::sui::SUI"
        },
        inputs: {
          coin_repay: "merge_funds.merged_coin",
          receipt: "borrow_1.receipt"
        }
      }
    ],
    edges: [
      { id: "e1", source: "borrow_1", source_output: "coin_borrowed", target: "swap_1", "target_input": "coin_in", edge_type: "COIN", coin_type: "0x2::sui::SUI" },
      { id: "e2", source: "swap_1", source_output: "usdc_coin", target: "swap_2", target_input: "coin_in", edge_type: "COIN", coin_type: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN" },
      { id: "e3", source: "swap_2", source_output: "sui_coin_swapped", target: "merge_funds", target_input: "target_coin", edge_type: "COIN", coin_type: "0x2::sui::SUI" },
      { id: "e4", source: "split_gas", source_output: "fee_coin", target: "merge_funds", target_input: "merge_coins", edge_type: "COIN", coin_type: "0x2::sui::SUI" },
      { id: "e5", source: "merge_funds", source_output: "merged_coin", target: "repay_1", target_input: "coin_repay", edge_type: "COIN", coin_type: "0x2::sui::SUI" },
      { id: "e6", source: "borrow_1", source_output: "receipt", target: "repay_1", target_input: "receipt", edge_type: "RECEIPT" }
    ]
  };

  const turbosStrategy: Strategy = {
    id: "123e4567-e89b-12d3-a456-426614174002",
    version: "1.0.0",
    meta: {
      name: "Turbos Round-Trip Arbitrage Test",
      author: sender,
      description: "Borrow SUI -> Swap to USDC -> Swap back to SUI -> Repay",
      created_at: Date.now(),
      updated_at: Date.now(),
      tags: ["test", "turbos", "flash-loan", "arbitrage"]
    },
    nodes: [
      {
        id: "borrow_1",
        type: "FLASH_BORROW",
        protocol: "NAVI",
        params: { asset: "0x2::sui::SUI", amount: "100000" },
        outputs: [
          { id: "coin_borrowed", type: "Coin<0x2::sui::SUI>", output_type: "COIN" },
          { id: "receipt", type: "FlashLoanReceipt", output_type: "RECEIPT" }
        ]
      },
      {
        id: "swap_1_sui_to_usdc",
        type: "CUSTOM",
        protocol: "CUSTOM",
        label: "Turbos Swap SUI→USDC",
        params: {
          target: "0xd02012c71c1a6a221e540c36c37c81e0224907fe1ee05bfe250025654ff17103::swap_router::swap_a_b_with_return_",
          arguments: [
            { type: "object", object_id: "0x5eb2dfcdd1b15d2021328258f6d5ec081e9a0cdcfa9e13a0eaeb9b5f7505ca78" },
            { type: "make_vec", input_ref: "borrow_1.coin_borrowed", value_type: "0x2::coin::Coin<0x2::sui::SUI>" },
            { type: "pure", value: "100000", value_type: "u64" },
            { type: "pure", value: "0", value_type: "u64" },
            { type: "pure", value: "4295048016", value_type: "u128" },
            { type: "pure", value: true, value_type: "bool" },
            { type: "pure", value: "0xd025128a33db4f04148eddfd994795e38bfb13d1c5f2cb2a2327be92246c13d0", value_type: "address" },
            { type: "pure", value: "9999999999999", value_type: "u64" },
            { type: "object", object_id: "0x6" },
            { type: "object", object_id: "0xf1cf0e81048df168ebeb1b8030fad24b3e0b53ae827c25053fff0779c1445b6f" }
          ],
          type_arguments: [
            "0x2::sui::SUI",
            "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
            "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::fee3000bps::FEE3000BPS"
          ]
        },
        inputs: { coin_in: "borrow_1.coin_borrowed" },
        outputs: [
          { id: "usdc_out", type: "Coin<0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN>", output_type: "COIN" },
          { id: "sui_remainder", type: "Coin<0x2::sui::SUI>", output_type: "COIN" }
        ]
      },
      {
        id: "swap_2_usdc_to_sui",
        type: "CUSTOM",
        protocol: "CUSTOM",
        label: "Turbos Swap USDC→SUI",
        params: {
          target: "0xd02012c71c1a6a221e540c36c37c81e0224907fe1ee05bfe250025654ff17103::swap_router::swap_b_a_with_return_",
          arguments: [
            { type: "object", object_id: "0x5eb2dfcdd1b15d2021328258f6d5ec081e9a0cdcfa9e13a0eaeb9b5f7505ca78" },
            { type: "make_vec", input_ref: "swap_1_sui_to_usdc.usdc_out", value_type: "0x2::coin::Coin<0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN>" },
            { type: "pure", value: "1", value_type: "u64" },
            { type: "pure", value: "0", value_type: "u64" },
            { type: "pure", value: "79226673515401279992447579055", value_type: "u128" },
            { type: "pure", value: false, value_type: "bool" },
            { type: "pure", value: "0xd025128a33db4f04148eddfd994795e38bfb13d1c5f2cb2a2327be92246c13d0", value_type: "address" },
            { type: "pure", value: "9999999999999", value_type: "u64" },
            { type: "object", object_id: "0x6" },
            { type: "object", object_id: "0xf1cf0e81048df168ebeb1b8030fad24b3e0b53ae827c25053fff0779c1445b6f" }
          ],
          type_arguments: [
            "0x2::sui::SUI",
            "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
            "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1::fee3000bps::FEE3000BPS"
          ]
        },
        inputs: { coin_in: "swap_1_sui_to_usdc.usdc_out" },
        outputs: [
          { id: "sui_swapped_back", type: "Coin<0x2::sui::SUI>", output_type: "COIN" },
          { id: "usdc_remainder", type: "Coin<0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN>", output_type: "COIN" }
        ]
      },
      {
        id: "transfer_sui_remainder",
        type: "CUSTOM",
        protocol: "CUSTOM",
        label: "Transfer SUI remainder to sender",
        params: {
          target: "0x2::transfer::public_transfer",
          arguments: [
            { type: "input", input_ref: "swap_1_sui_to_usdc.sui_remainder" },
            { type: "pure", value: sender, value_type: "address" }
          ],
          type_arguments: ["0x2::coin::Coin<0x2::sui::SUI>"]
        },
        inputs: { coin_in: "swap_1_sui_to_usdc.sui_remainder" },
        outputs: []
      },
      {
        id: "transfer_usdc_remainder",
        type: "CUSTOM",
        protocol: "CUSTOM",
        label: "Transfer USDC remainder to sender",
        params: {
          target: "0x2::transfer::public_transfer",
          arguments: [
            { type: "input", input_ref: "swap_2_usdc_to_sui.usdc_remainder" },
            { type: "pure", value: sender, value_type: "address" }
          ],
          type_arguments: ["0x2::coin::Coin<0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN>"]
        },
        inputs: { coin_in: "swap_2_usdc_to_sui.usdc_remainder" },
        outputs: []
      },
      {
        id: "split_wallet_sui",
        type: "COIN_SPLIT",
        protocol: "NATIVE",
        params: { amounts: ["10000000"] },
        inputs: { coin: "GAS" },
        outputs: [
          { id: "wallet_sui", type: "Coin<0x2::sui::SUI>", output_type: "COIN" }
        ]
      },
      {
        id: "merge_sui",
        type: "COIN_MERGE",
        protocol: "NATIVE",
        params: {},
        inputs: {
          target_coin: "swap_2_usdc_to_sui.sui_swapped_back",
          merge_coins: ["split_wallet_sui.wallet_sui"]
        },
        outputs: [
          { id: "merged_sui", type: "Coin<0x2::sui::SUI>", output_type: "COIN" }
        ]
      },
      {
        id: "repay_1",
        type: "FLASH_REPAY",
        protocol: "NAVI",
        params: { asset: "0x2::sui::SUI" },
        inputs: {
          coin_repay: "merge_sui.merged_sui",
          receipt: "borrow_1.receipt"
        }
      }
    ],
    edges: [
      { id: "e1", source: "borrow_1", source_output: "coin_borrowed", target: "swap_1_sui_to_usdc", target_input: "coin_in", edge_type: "COIN", coin_type: "0x2::sui::SUI" },
      { id: "e2", source: "swap_1_sui_to_usdc", source_output: "usdc_out", target: "swap_2_usdc_to_sui", target_input: "coin_in", edge_type: "COIN", coin_type: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN" },
      { id: "e3", source: "swap_1_sui_to_usdc", source_output: "sui_remainder", target: "transfer_sui_remainder", target_input: "coin_in", edge_type: "COIN", coin_type: "0x2::sui::SUI" },
      { id: "e4", source: "swap_2_usdc_to_sui", source_output: "sui_swapped_back", target: "merge_sui", target_input: "target_coin", edge_type: "COIN", coin_type: "0x2::sui::SUI" },
      { id: "e5", source: "split_wallet_sui", source_output: "wallet_sui", target: "merge_sui", target_input: "merge_coins", edge_type: "COIN", "coin_type": "0x2::sui::SUI" },
      { id: "e6", source: "merge_sui", source_output: "merged_sui", target: "repay_1", target_input: "coin_repay", edge_type: "COIN", coin_type: "0x2::sui::SUI" },
      { id: "e7", source: "borrow_1", source_output: "receipt", target: "repay_1", target_input: "receipt", edge_type: "RECEIPT" },
      { id: "e8", source: "swap_2_usdc_to_sui", source_output: "usdc_remainder", target: "transfer_usdc_remainder", target_input: "coin_in", edge_type: "COIN", coin_type: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN" }
    ]
  };

  // Select strategy (default to turbos)
  const useTurbos = true;
  const strategy = useTurbos ? turbosStrategy : minimalStrategy;

  console.log(`\n📋 Selected Strategy: ${strategy.meta.name}`);

  // 3. Build Transaction
  console.log("\n📦 Building transaction...");
  const builder = new TransactionBuilder();
  const tx = await builder.buildFromStrategy(strategy);
  tx.setSender(sender);
  tx.setGasBudget(10000000); // 0.01 SUI max for gas

  console.log("✅ Transaction built successfully\n");

  // 4. Execute on Mainnet
  console.log("🚀 Executing flash loan on mainnet...");
  console.log("⚠️  This will spend real SUI on mainnet!\n");

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showBalanceChanges: true,
      showObjectChanges: true,
      showEvents: true,
    },
  });

  console.log("\n✅ Flash Loan Executed Successfully!");
  console.log("═══════════════════════════════════════\n");
  console.log("📝 Transaction Digest:", result.digest);

  if (result.effects) {
    console.log("\n💰 Gas Used:");
    console.log("   - Computation:", result.effects.gasUsed.computationCost);
    console.log("   - Storage:", result.effects.gasUsed.storageCost);
    console.log("   - Storage Rebate:", result.effects.gasUsed.storageRebate);
    console.log("   - Total:", (
      BigInt(result.effects.gasUsed.computationCost) +
      BigInt(result.effects.gasUsed.storageCost) -
      BigInt(result.effects.gasUsed.storageRebate)
    ).toString(), "MIST");
  }

  if (result.balanceChanges && result.balanceChanges.length > 0) {
    console.log("\n💸 Balance Changes:");
    result.balanceChanges.forEach((change: any) => {
      const amount = BigInt(change.amount);
      const sui = Number(amount) / 1_000_000_000;
      console.log(`   ${change.coinType}: ${sui.toFixed(9)} SUI (${change.amount} MIST)`);
    });
  }

  if (result.events && result.events.length > 0) {
    console.log("\n📡 Events:");
    result.events.forEach((event: any, i: number) => {
      console.log(`   ${i + 1}. ${event.type}`);
    });
  }

  console.log("\n🔍 View on Explorer:");
  console.log(`   https://suiscan.xyz/mainnet/tx/${result.digest}`);
  console.log("\n═══════════════════════════════════════\n");
}

executeFlashLoan().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
