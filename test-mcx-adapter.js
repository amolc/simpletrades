const { initializeTvAdapter, getQuoteWithAdapter, normalizeMcxSymbol } = require('./api/tvAdapterController.js');

async function testMcxSymbols() {
  console.log('Initializing adapter...');
  initializeTvAdapter();
  
  // Wait a bit for initialization
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\nTesting MCX symbols:');
  
  // Test CRUDEOIL
  try {
    console.log('\n1. Testing CRUDEOIL (normalized to CRUDEOIL1!)');
    const crudeResult = await getQuoteWithAdapter('CRUDEOIL1!', 'MCX');
    console.log('CRUDEOIL Result:', crudeResult);
  } catch (error) {
    console.error('CRUDEOIL Error:', error.message);
  }
  
  // Test option symbol normalization
  const optionSymbol = 'CRUDEOIL251216C5200';
  console.log('\n2. Testing option symbol normalization:');
  console.log('Original:', optionSymbol);
  console.log('Normalized:', normalizeMcxSymbol(optionSymbol));
  
  // Test the normalized option symbol
  try {
    const normalizedOption = normalizeMcxSymbol(optionSymbol);
    console.log('\n3. Testing normalized option symbol:', normalizedOption);
    const optionResult = await getQuoteWithAdapter(normalizedOption, 'MCX');
    console.log('Option Result:', optionResult);
  } catch (error) {
    console.error('Option Error:', error.message);
  }
}

testMcxSymbols().catch(console.error);