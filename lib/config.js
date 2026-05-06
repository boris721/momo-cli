import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';

const CONFIG_DIR = join(homedir(), '.config', 'momo-cli');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

// Legacy single-account format: { secret, clientId }
// New multi-account format: { default, profiles: { name: { secret, clientId } } }
function isNewFormat(config) {
  return config && config.profiles && typeof config.profiles === 'object';
}

function migrateLegacy(config) {
  return {
    default: 'default',
    profiles: {
      default: { secret: config.secret, clientId: config.clientId }
    }
  };
}

export function getConfigPath() {
  return CONFIG_PATH;
}

export function getConfigDir() {
  return CONFIG_DIR;
}

export function loadConfig() {
  try {
    if (!existsSync(CONFIG_PATH)) {
      return null;
    }
    const data = readFileSync(CONFIG_PATH, 'utf8');
    let config = JSON.parse(data);
    // Auto-migrate legacy format
    if (!isNewFormat(config) && config.secret) {
      config = migrateLegacy(config);
      saveConfig(config);
    }
    return config;
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

export function hasCredentials(config) {
  return config && config.secret && config.clientId;
}

/**
 * Get credentials for a specific profile.
 * If profileName is null/undefined, uses the default profile.
 * Profile can be specified via --profile flag or MOMO_PROFILE env var.
 */
export function getCredentials(profileName) {
  // Profile priority: explicit arg > env var > config default
  const effectiveProfile = profileName || process.env.MOMO_PROFILE || null;

  const config = loadConfig();
  if (!config) {
    return null;
  }

  if (!isNewFormat(config)) {
    return { secret: config.secret, clientId: config.clientId, name: 'default' };
  }

  const name = effectiveProfile || config.default || 'default';
  const profile = config.profiles[name];

  if (!profile) {
    return null;
  }

  return { ...profile, name };
}

/**
 * Save credentials for a named profile.
 * If no name given, saves to default profile.
 */
export function saveCredentials(profileName, secret, clientId) {
  const config = loadConfig() || { default: 'default', profiles: {} };

  if (!isNewFormat(config)) {
    config.default = 'default';
    config.profiles = { default: { secret: config.secret, clientId: config.clientId } };
  }

  const name = profileName || config.default || 'default';
  config.profiles[name] = { secret, clientId };

  saveConfig(config);
  return name;
}

/**
 * List all configured profiles.
 */
export function listProfiles() {
  const config = loadConfig();
  if (!config) {
    return [];
  }

  if (!isNewFormat(config)) {
    return [{ name: 'default', isDefault: true, secret: config.secret, clientId: config.clientId }];
  }

  const defaultName = config.default || 'default';
  return Object.keys(config.profiles).map(name => ({
    name,
    isDefault: name === defaultName,
    clientId: config.profiles[name].clientId,
    secret: config.profiles[name].secret
  }));
}

/**
 * Set the default profile name.
 */
export function setDefaultProfile(name) {
  const config = loadConfig();
  if (!config) {
    throw new Error('No configuration found. Run: momo auth <name> <secret> <clientid>');
  }

  if (!isNewFormat(config)) {
    config.default = 'default';
    config.profiles = { default: { secret: config.secret, clientId: config.clientId } };
  }

  if (!config.profiles[name]) {
    throw new Error(`Profile "${name}" not found. Available: ${Object.keys(config.profiles).join(', ')}`);
  }

  config.default = name;
  saveConfig(config);
}

/**
 * Delete a profile.
 */
export function deleteProfile(name) {
  const config = loadConfig();
  if (!config) {
    throw new Error('No configuration found.');
  }

  if (!isNewFormat(config)) {
    config.default = 'default';
    config.profiles = { default: { secret: config.secret, clientId: config.clientId } };
  }

  if (!config.profiles[name]) {
    throw new Error(`Profile "${name}" not found.`);
  }

  if (Object.keys(config.profiles).length <= 1) {
    throw new Error('Cannot delete the last profile.');
  }

  delete config.profiles[name];

  // If we deleted the default, set a new one
  if (config.default === name) {
    config.default = Object.keys(config.profiles)[0];
  }

  saveConfig(config);
}
