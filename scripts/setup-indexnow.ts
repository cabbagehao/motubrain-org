#!/usr/bin/env tsx

import 'dotenv/config';

import { relative } from 'node:path';

import { ensureIndexNowSetup } from './indexnow-config';

async function main() {
  const result = await ensureIndexNowSetup();
  const keyPath = relative(process.cwd(), result.keyFilePath);

  process.stdout.write(
    `${result.createdKey ? 'Created' : 'Verified'} IndexNow key ${result.key} at ${keyPath}\n`
  );
}

void main().catch((error) => {
  console.error('IndexNow setup failed:', error);
  process.exitCode = 1;
});
