import { homedir } from 'node:os';
import { join } from 'node:path';

export function getSzuHome() {
  return process.env.SZU_CLI_HOME || join(homedir(), '.szu-cli');
}

export function getProfilePath() {
  return join(getSzuHome(), 'browser-profile');
}
