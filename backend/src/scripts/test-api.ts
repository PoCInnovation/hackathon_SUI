
import { Strategy, FlashBorrowNode, FlashRepayNode } from '../types/strategy';

async function test() {
  console.log('🚀 Starting API Test...');
  
  const API_URL = 'http://localhost:8000/api';
  const sender = '0x0000000000000000000000000000000000000000000000000000000000000000';

  // Strategy: Flash Borrow SUI -> Repay SUI (Same as simulator test)
  const strategy: Strategy = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    version: '1.0.0',
    meta: {
      name: 'API Test Strategy',
      author: sender,
      description: 'Test flash loan via API',
      created_at: Date.now(),
      updated_at: Date.now(),
      tags: ['test', 'api']
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
    edges: []
  };

  // 1. Test Validation Endpoint
  console.log('\n1. Testing /validate endpoint...');
  try {
    const res = await fetch(`${API_URL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy })
    });
    const data = await res.json() as any;
    console.log('✅ Validation Result:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }

  // 2. Test Simulation Endpoint
  console.log('\n2. Testing /simulate endpoint...');
  try {
    const res = await fetch(`${API_URL}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy, sender })
    });
    const data = await res.json() as any;
    console.log('✅ Simulation Result:', JSON.stringify(data, null, 2));
    
    if (data.success === false && data.errors && data.errors.length > 0) {
        console.log('   (Note: Failure is expected for this mock strategy on Mainnet, confirming API connectivity)');
    }
    
  } catch (error) {
    console.error('❌ Simulation failed:', error);
  }
}

test();

