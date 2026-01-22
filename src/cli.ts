#!/usr/bin/env node
import {runValidation} from './app/validation';

const command = process.argv[2];

async function main(): Promise<void> {
  switch (command) {
    case 'validate': {
      const result = await runValidation();
      if (!result.success) {
        process.exit(1);
      }
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Available commands: validate');
      process.exit(1);
  }
}

void main();
