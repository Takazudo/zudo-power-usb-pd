#!/usr/bin/env node

/**
 * Simple stdin formatter wrapper for the mdx-formatter
 * Usage: echo "content" | node format-stdin.js
 */

import { format } from './src/index.js';
import { readFileSync } from 'fs';

async function main() {
  try {
    // Read from stdin
    const input = readFileSync(0, 'utf8');
    
    // Format the content
    const formatted = await format(input);
    
    // Output to stdout
    process.stdout.write(formatted);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();