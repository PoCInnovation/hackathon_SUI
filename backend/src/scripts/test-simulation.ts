
import { Simulator } from '../core/simulator';
import { Strategy, FlashBorrowNode, FlashRepayNode } from '../types/strategy';

async function test() {
  console.log('🚀 Starting Simulator Test on Testnet...');

  const simulator = new Simulator('mainnet');
  const sender = '0x0000000000000000000000000000000000000000000000000000000000000000'; // Dummy sender

  // Strategy: Flash Borrow SUI -> Repay SUI
  // This is expected to fail on-chain because we don't generate enough profit to pay the flash loan fee.
  // However, it verifies the simulation pipeline.
  const strategy: Strategy = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    version: '1.0.0',
    meta: {
      name: 'Test Simulation',
      author: sender,
      description: 'Test flash loan simulation',
      created_at: Date.now(),
      updated_at: Date.now(),
      tags: ['test']
    },
    nodes: [
      {
        id: 'borrow_1',
        type: 'FLASH_BORROW',
        protocol: 'NAVI',
        params: {
          asset: '0x2::sui::SUI',
          amount: '1000000000', // 1 SUI
        },
        outputs: [
          { id: 'coin_borrowed', type: 'Coin<0x2::sui::SUI>', output_type: 'COIN' },
          { id: 'receipt', type: 'FlashLoanReceipt', output_type: 'RECEIPT' }
        ]
      } as FlashBorrowNode,
      {
        id: 'repay_1',
        type: 'FLASH_REPAY',
        protocol: 'NAVI',
        params: {
          asset: '0x2::sui::SUI',
        },
        inputs: {
          coin_repay: 'borrow_1.coin_borrowed',
          receipt: 'borrow_1.receipt'
        }
      } as FlashRepayNode
    ],
    edges: [
        // Edges are not strictly used by the builder (it uses inputs/refs), but good to have for validity
        {
            id: 'e1',
            source: 'borrow_1',
            source_output: 'coin_borrowed',
            target: 'repay_1',
            target_input: 'coin_repay',
            edge_type: 'COIN',
            coin_type: '0x2::sui::SUI'
        },
        {
            id: 'e2',
            source: 'borrow_1',
            source_output: 'receipt',
            target: 'repay_1',
            target_input: 'receipt',
            edge_type: 'RECEIPT'
        }
    ]
  };

  try {
    console.log('1. Running Simulation...');
    const result = await simulator.simulate(strategy, sender);
    
    console.log('📊 Simulation Result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Gas Used: ${result.estimated_gas}`);
    console.log(`   Profit/Loss:`, result.estimated_profit_loss);
    
    if (!result.success) {
        console.log('   Errors:', result.errors.map(e => e.message));
    }

    console.log('🎉 Test pipeline completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();

