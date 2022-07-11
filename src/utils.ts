import * as core from '@actions/core';

export function exitWithError(message: string, code?: number) {
  core.error(message);
  process.exit(code ?? 1);
}
