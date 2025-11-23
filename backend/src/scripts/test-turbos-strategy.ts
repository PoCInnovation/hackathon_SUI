
import fs from 'fs';
import path from 'path';
import { Simulator } from '../core/simulator';
import { Strategy } from '../types/strategy';

async function testTurbosStrategy() {
  console.log('🚀 Starting Turbos Strategy Test...');

  const simulator = new Simulator('mainnet');
  
  // Read strategy files
  const strategyPath = path.join(process.cwd(), '../turbos_strategy.json');
  const simpleStrategyPath = path.join(process.cwd(), '../turbos_simple_strategy.json');

  try {
    const strategyContent = fs.readFileSync(strategyPath, 'utf-8');
    const simpleStrategyContent = fs.readFileSync(simpleStrategyPath, 'utf-8');

    const strategyJson = JSON.parse(strategyContent);
    const simpleStrategyJson = JSON.parse(simpleStrategyContent);

    const sender = strategyJson.sender;
    const strategy = strategyJson.strategy;
    const simpleStrategy = simpleStrategyJson.strategy;

    console.log(`\n📋 Testing Strategy: ${strategy.meta.name}`);
    console.log(`Sender: ${sender}`);

    // Test Complex Strategy
    console.log('\n1. Running Simulation for Complex Strategy...');
    const result = await simulator.simulate(strategy, sender);
    
    console.log('📊 Simulation Result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Gas Used: ${result.estimated_gas}`);
    
    if (!result.success) {
        console.log('   Errors:', JSON.stringify(result.errors, null, 2));
    } else {
        console.log('   Profit/Loss:', result.estimated_profit_loss);
    }

    // Test Simple Strategy
    console.log(`\n📋 Testing Strategy: ${simpleStrategy.meta.name}`);
    console.log('\n2. Running Simulation for Simple Strategy...');
    const simpleResult = await simulator.simulate(simpleStrategy, sender);
    
    console.log('📊 Simulation Result:');
    console.log(`   Success: ${simpleResult.success}`);
    console.log(`   Gas Used: ${simpleResult.estimated_gas}`);
    
    if (!simpleResult.success) {
        console.log('   Errors:', JSON.stringify(simpleResult.errors, null, 2));
    } else {
        console.log('   Profit/Loss:', simpleResult.estimated_profit_loss);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTurbosStrategy();
