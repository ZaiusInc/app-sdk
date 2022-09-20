/* eslint-disable @typescript-eslint/no-unused-vars */
namespace NodeJS {
  interface ProcessEnv {
    LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error' | 'NEVER' | undefined;
  }
}
