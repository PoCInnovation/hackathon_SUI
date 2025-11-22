
import { Transaction } from '@mysten/sui/transactions';
import { CetusAdapter } from '../adapters/dex/cetus-adapter';
import { DexSwapNode } from '../types/strategy';

async function test() {
  console.log('🚀 Starting Cetus Adapter Test on Mainnet...');

  const adapter = new CetusAdapter();

  // Mock Swap Node
  // Swapping SUI to USDC on Mainnet
  const swapNode: DexSwapNode = {
    id: 'swap_1',
    type: 'DEX_SWAP',
    protocol: 'CETUS',
    params: {
      pool_id: '0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630', // Mainnet SUI-USDC pool
      coin_type_a: '0x2::sui::SUI',
      coin_type_b: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN', // wUSDC
      direction: 'A_TO_B',
      amount_mode: 'EXACT_IN',
      amount: '1000000000', // 1 SUI
      slippage_tolerance: '0.01',
    },
    inputs: { coin_in: 'mock_input' },
    outputs: [{ id: 'coin_out', type: 'Coin<USDC>', output_type: 'COIN' }]
  };

  console.log('1. Pre-swap simulation...');
  try {
    const estimate = await adapter.preSwap(swapNode);
    console.log('✅ Pre-swap success:', estimate);

    console.log('2. Building PTB...');
    const tx = new Transaction();
    // Add dummy sender to avoid build error
    tx.setSender('0x0000000000000000000000000000000000000000000000000000000000000000');
    
    const coinIn = tx.splitCoins(tx.gas, [tx.pure.u64(1000000000)]);
    
    const coinOut = adapter.swap(tx, swapNode, coinIn, estimate);
    console.log('✅ Swap built successfully');
    
    await tx.build({ client: undefined as any });
    console.log('✅ PTB construction verified');
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();
