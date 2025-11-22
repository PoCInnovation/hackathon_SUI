import { readFileSync } from 'fs';

/**
 * Script to upload a workflow JSON to the marketplace
 * 
 * Usage:
 *   pnpm tsx src/scripts/upload-workflow-to-marketplace.ts path/to/workflow.json
 * 
 * The JSON file should follow the Strategy format with nodes and edges.
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:8000/api';

async function uploadWorkflow(filePath: string) {
  try {
    console.log('📂 Reading workflow file:', filePath);
    
    // Read and parse the JSON file
    const fileContent = readFileSync(filePath, 'utf-8');
    const workflow = JSON.parse(fileContent);

    // Validate basic structure
    if (!workflow.id || !workflow.version || !workflow.meta || !workflow.nodes || !workflow.edges) {
      throw new Error('Invalid workflow format. Required fields: id, version, meta, nodes, edges');
    }

    // Validate meta
    if (!workflow.meta.name || !workflow.meta.description || !workflow.meta.tags) {
      throw new Error('Invalid meta. Required fields: name, description, tags');
    }

    // Add price if not present (default to 0.1 SUI)
    if (typeof workflow.meta.price_sui !== 'number') {
      workflow.meta.price_sui = 0.1;
      console.log('⚠️  No price specified, using default: 0.1 SUI');
    }

    console.log('\n📋 Workflow Details:');
    console.log('   Name:', workflow.meta.name);
    console.log('   Author:', workflow.meta.author);
    console.log('   Description:', workflow.meta.description);
    console.log('   Tags:', workflow.meta.tags.join(', '));
    console.log('   Price:', workflow.meta.price_sui, 'SUI');
    console.log('   Nodes:', workflow.nodes.length);
    console.log('   Edges:', workflow.edges.length);

    // Upload to marketplace
    console.log('\n🚀 Uploading to marketplace...');
    const response = await fetch(`${API_BASE_URL}/workflows/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflow),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    console.log('\n✅ Workflow uploaded successfully!');
    console.log('═══════════════════════════════════════\n');
    console.log('📝 Workflow ID:', result.data.id);
    console.log('🔐 Metadata Blob ID:', result.data.metadataBlobId);
    console.log('📦 Data Blob ID:', result.data.dataBlobId);
    console.log('💰 Price:', result.data.price_sui, 'SUI');
    console.log('\n🌐 Walrus URLs:');
    console.log('   Metadata:', result.data.walrusUrls.metadata);
    console.log('   Data:', result.data.walrusUrls.data);
    console.log('\n═══════════════════════════════════════\n');
    console.log('✨ Your workflow is now available on the marketplace!');
    console.log('   Others can purchase it for', result.data.price_sui, 'SUI');
    console.log('   Note: Users must first pay 0.5 SUI to join the whitelist,');
    console.log('   then they can purchase and decrypt any workflow.\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Usage: pnpm tsx src/scripts/upload-workflow-to-marketplace.ts <path-to-workflow.json>');
  console.error('\nExample:');
  console.error('   pnpm tsx src/scripts/upload-workflow-to-marketplace.ts ./examples/arbitrage-workflow.json');
  process.exit(1);
}

const workflowPath = args[0];
uploadWorkflow(workflowPath);
