import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';

const CONFIG_PATH = join(homedir(), '.config', 'momo-cli', 'config.json');

export function getConfigPath() {
  return CONFIG_PATH;
}

export function loadConfig() {
  try {
    if (!existsSync(CONFIG_PATH)) {
      return null;
    }
    const data = readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveConfig(config) {
  const dir = dirname(CONFIG_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function hasCredentials() {
  const config = loadConfig();
  return config && config.secret && config.clientId;
}
