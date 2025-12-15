const { initializeTvAdapter, getQuoteWithAdapter, normalizeMcxSymbol } = require('./api/tvAdapterController.js');

async function testMcxOptions() {
  console.log('Testing MCX Crudeoil Options...\n');
  
  // Initialize adapter
  console.log('1. Initializing adapter...');
  initializeTvAdapter();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test different option formats
  const testSymbols = [
    { original: 'CRUDEOIL251216C5200', normalized: 'CRUDEOIL16DEC255200CE' },
    { original: 'CRUDEOIL251216P5200', normalized: 'CRUDEOIL16DEC255200PE' },
    { original: 'CRUDEOIL261216C5300', normalized: 'CRUDEOIL16DEC265300CE' },
    { original: 'CRUDEOIL311216C5000', normalized: 'CRUDEOIL31DEC255000CE' },
    // Try without normalization first
    { original: 'CRUDEOIL1!', normalized: 'CRUDEOIL1!' },
    { original: 'CRUDEOIL', normalized: 'CRUDEOIL1!' }
  ];
  
  console.log('2. Testing symbol normalization:');
  testSymbols.forEach(({original, normalized}) => {
    const result = normalizeMcxSymbol(original);
    console.log(`   ${original} -> ${result} (expected: ${normalized})`);
  });
  
  console.log('\n3. Testing quote retrieval for each symbol:');
  
  for (const {original, normalized} of testSymbols) {
    try {
      console.log(`\n   Testing: ${original} (${normalized})`);
      const result = await getQuoteWithAdapter(normalized, 'MCX');
      console.log(`   ✓ SUCCESS: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.log(`   ✗ FAILED: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Also try some alternative formats that might work
  console.log('\n4. Testing alternative option formats:');
  const altFormats = [
    'CRUDEOIL2024-12-16C5200',
    'CRUDEOIL-16DEC25-5200-C',
    'CRUDEOIL-16DEC25-CE-5200',
    'CRUDEOIL16DEC25C5200'
  ];
  
  for (const format of altFormats) {
    try {
      console.log(`\n   Testing alternative: ${format}`);
      const result = await getQuoteWithAdapter(format, 'MCX');
      console.log(`   ✓ SUCCESS: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.log(`   ✗ FAILED: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testMcxOptions().catch(console.error);