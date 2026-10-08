import dotenv from 'dotenv';
dotenv.config();

import { fastdb } from '../lib/fastdb';

async function main() {
  console.log('--- FastDB Status Check ---');
  const collections = ['users', 'products', 'stores', 'orders', 'conversations'];
  for (const col of collections) {
    try {
      const snap = await fastdb.collection(col).get();
      console.log(`Collection "${col}": ${snap.size} documents`);
    } catch (err: any) {
      console.error(`Collection "${col}" failed:`, err.message);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
