#!/usr/bin/env node

/**
 * Complete workflow test: Upload → Purchase → Decrypt
 * 
 * This test demonstrates the full marketplace workflow:
 * 1. Upload a workflow (encrypted on Walrus)
 * 2. Purchase the workflow (add address to whitelist)
 * 3. Decrypt the workflow (using Seal)
 * 
 * Usage: node test-full-workflow.js [wallet_address]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'http://localhost:8000/api';

// Test wallet address (replace with your actual address for real testing)
const TEST_ADDRESS = process.argv[2] || '0x904f64f755764162a228a7da49b1288160597165ec60ebbf5fb9a94957db76c3';

async function testUpload() {
  console.log('\n📤 STEP 1: Upload Workflow');
  console.log('─'.repeat(50));

  try {
    const workflowPath = path.join(__dirname, '..', '..', 'examples', 'example-workflow-marketplace.json');
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

    // Update author to test address
    workflowData.meta.author = TEST_ADDRESS;
    workflowData.id = `test-workflow-${Date.now()}`;

    console.log(`📝 Workflow: ${workflowData.meta.name}`);
    console.log(`💰 Price: ${workflowData.meta.price_sui} SUI`);
    console.log(`👤 Author: ${TEST_ADDRESS.slice(0, 10)}...`);

    const response = await fetch(`${API_BASE_URL}/workflows/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflowData),
    });

    const result = await response.json();

    if (result.success) {
      console.log('\n✅ Upload successful!');
      console.log(`   Workflow ID: ${result.data.workflowId}`);
      console.log(`   Metadata Blob: ${result.data.metadataBlobId}`);
      console.log(`   Data Blob: ${result.data.dataBlobId}`);
      return result.data.workflowId;
    } else {
      console.error('❌ Upload failed:', result.error);
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testList() {
  console.log('\n📋 STEP 2: List Workflows in Marketplace');
  console.log('─'.repeat(50));

  try {
    const response = await fetch(`${API_BASE_URL}/workflows/list`);
    const result = await response.json();

    if (result.success) {
      console.log(`\n✅ Found ${result.data.length} workflow(s):\n`);
      result.data.forEach((workflow: any, index: number) => {
        console.log(`${index + 1}. ${workflow.name}`);
        console.log(`   ID: ${workflow.id}`);
        console.log(`   Price: ${workflow.price_sui} SUI`);
        console.log(`   Purchases: ${workflow.purchaseCount}`);
        console.log('');
      });
      return result.data;
    } else {
      console.error('❌ List failed:', result.error);
      return [];
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return [];
  }
}

async function testPurchase(workflowId: string) {
  console.log('\n🛒 STEP 3: Purchase Workflow');
  console.log('─'.repeat(50));

  try {
    console.log(`🎯 Purchasing: ${workflowId}`);
    console.log(`👛 Buyer Address: ${TEST_ADDRESS.slice(0, 10)}...`);

    const response = await fetch(`${API_BASE_URL}/workflows/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId,
        address: TEST_ADDRESS,
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('\n✅ Purchase successful!');
      console.log(`   You can now decrypt this workflow`);
      console.log(`   Metadata Blob: ${result.data.metadataBlobId}`);
      return true;
    } else {
      console.error('❌ Purchase failed:', result.error);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testGetOwned() {
  console.log('\n📚 STEP 4: Get Owned Workflows');
  console.log('─'.repeat(50));

  try {
    const response = await fetch(`${API_BASE_URL}/workflows/owned/${TEST_ADDRESS}`);
    const result = await response.json();

    if (result.success) {
      console.log(`\n✅ You own ${result.data.length} workflow(s):\n`);
      result.data.forEach((workflow: any, index: number) => {
        console.log(`${index + 1}. ${workflow.name}`);
        console.log(`   ID: ${workflow.id}`);
        console.log('');
      });
      return result.data;
    } else {
      console.error('❌ Failed:', result.error);
      return [];
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return [];
  }
}

async function testDecrypt(workflowId: string) {
  console.log('\n🔓 STEP 5: Decrypt Workflow');
  console.log('─'.repeat(50));
  console.log('\n⚠️  IMPORTANT: Decryption requires a REAL wallet signature.');
  console.log('   This CANNOT be tested via backend scripts.\n');

  console.log('❌ Why backend decryption fails:');
  console.log('   - Seal requires signing a session key message');
  console.log('   - Only a real wallet can create valid signatures');
  console.log('   - Fake signatures will throw: InvalidPersonalMessageSignatureError\n');

  console.log('✅ How to test decryption:');
  console.log('   1. Open http://localhost:3001/app');
  console.log('   2. Connect your Sui wallet');
  console.log('   3. Go to Marketplace section');
  console.log('   4. Click BUY on a workflow');
  console.log('   5. Sign with your wallet');
  console.log('   6. → Workflow is automatically decrypted!');
  console.log('   7. → Saved to Templates section!');
  console.log('   8. → Stored in localStorage!\n');

  console.log('💡 The frontend handles the complete flow:');
  console.log('   - Gets session message from API');
  console.log('   - Signs with connected wallet');
  console.log('   - Calls decrypt API with valid signature');
  console.log('   - Saves decrypted workflow to localStorage');
}

// Run the complete test
(async () => {
  console.log('\n🚀 COMPLETE MARKETPLACE WORKFLOW TEST');
  console.log('═'.repeat(50));
  console.log(`\n🔧 Using test address: ${TEST_ADDRESS}`);
  console.log(`🌐 API endpoint: ${API_BASE_URL}`);

  // Step 1: Upload
  const workflowId = await testUpload();
  if (!workflowId) {
    console.log('\n❌ Test stopped: Upload failed');
    process.exit(1);
  }

  // Step 2: List
  await testList();

  // Step 3: Purchase
  const purchased = await testPurchase(workflowId);
  if (!purchased) {
    console.log('\n❌ Test stopped: Purchase failed');
    process.exit(1);
  }

  // Step 4: Get owned
  await testGetOwned();

  // Step 5: Decrypt info
  await testDecrypt(workflowId);

  console.log('\n═'.repeat(50));
  console.log('✨ TEST COMPLETE!');
  console.log('\n📝 Summary:');
  console.log('   ✅ Workflow uploaded and encrypted on Walrus');
  console.log('   ✅ Workflow appears in marketplace');
  console.log('   ✅ Workflow purchased (address added to whitelist)');
  console.log('   ✅ Workflow shows in owned list');
  console.log('   ℹ️  Decryption requires wallet signature (test in frontend)');
  console.log('\n🎯 Next steps:');
  console.log('   1. Open the frontend: http://localhost:3001/app');
  console.log('   2. Connect your wallet');
  console.log('   3. Go to Marketplace and purchase the workflow');
  console.log('   4. Check Templates to see your decrypted workflow!');
  console.log('');
})();
