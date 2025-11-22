
import { Transaction } from '@mysten/sui/transactions';
import { NaviAdapter } from '../adapters/flashloan/navi-adapter';
import { FlashBorrowNode, FlashRepayNode } from '../types/strategy';

async function test() {
  console.log('🚀 Starting Navi Flash Loan Adapter Test on Mainnet...');

  const adapter = new NaviAdapter();
  
  // Mock Flash Loan Nodes
  // Borrow 1 SUI
  const borrowNode: FlashBorrowNode = {
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
  };

  const repayNode: FlashRepayNode = {
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
  };

  try {
    console.log('1. Building PTB with Flash Loan...');
    const tx = new Transaction();
    // Add dummy sender to avoid build error
    tx.setSender('0x0000000000000000000000000000000000000000000000000000000000000000');
    
    // 1. Borrow
    console.log('   - Adding Borrow command...');
    const { coin, receipt } = adapter.borrow(tx, borrowNode);
    
    // 2. (Simulation of doing something with the coin)
    
    // 3. Repay
    console.log('   - Adding Repay command...');
    adapter.repay(tx, repayNode, coin, receipt);
    
    console.log('✅ PTB built successfully');
    
    // Verify transaction data (serialize)
    await tx.build({ client: undefined as any });
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();
