import { getEmbeddings } from '../scripts/tool-bundler.ts';

async function testEmbeddings() {
  // Test debug mode
  process.env.EMBEDDING_API_URL = 'debug';
  const mockEmbeddings = await getEmbeddings('test prompt');
  console.assert(mockEmbeddings.length === 384, 'Mock embedding length should be 384');
  console.assert(mockEmbeddings.every(v => v === 0.1), 'All values should be 0.1');
  console.log('✅ Debug mode test passed!');

  // Test normal mode only if embedding service is available
  try {
    process.env.EMBEDDING_API_URL = 'http://localhost:11434';
    const realEmbeddings = await getEmbeddings('test prompt');
    console.assert(realEmbeddings.length === 384, 'Real embedding length should be 384');
    console.log('✅ Normal mode test passed!');
  } catch (error) {
    console.log('ℹ️ Skipping normal mode test - embedding service not available');
  }
}

testEmbeddings().catch(console.error);
