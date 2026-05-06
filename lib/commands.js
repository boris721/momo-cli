import { saveCredentials, loadConfig, hasCredentials, getCredentials, listProfiles, setDefaultProfile, deleteProfile } from './config.js';
import * as api from './api.js';
import { formatDuration, parseTime, isTimeFormat, getTodayDate, calculateElapsed } from './format.js';

// ANSI color utilities
function hexToAnsi(hex) {
  if (!hex) return null;
  const match = hex.match(/^#([A-Fa-f0-9]{2})([A-Fa-f0-9]{2})([A-Fa-f0-9]{2})/);
  if (!match) return null;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

const RESET = '\x1b[0m';

function colorize(text, hex) {
  const ansi = hexToAnsi(hex);
  if (!ansi) return text;
  return `${ansi}${text}${RESET}`;
}

/**
 * Extract --profile from args and return { profileName, remainingArgs }
 */
export function extractProfile(args) {
  let profileName = null;
  const remaining = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile' && args[i + 1]) {
      profileName = args[i + 1];
      i++;
    } else {
      remaining.push(args[i]);
    }
  }
  return { profileName, remainingArgs: remaining };
}

// Show which profile is active (called internally, not shown to user)
function activeProfileName(profileName) {
  const creds = getCredentials(profileName);
  return creds ? creds.name : null;
}

export async function authSave(profileOrSecret, secretOrClientId, maybeClientId) {
  let profileName, secret, clientId;

  if (maybeClientId) {
    // 3 args: momo auth <profile> <secret> <clientid>
    profileName = profileOrSecret;
    secret = secretOrClientId;
    clientId = maybeClientId;
  } else if (profileOrSecret && secretOrClientId) {
    // 2 args: legacy mode, momo auth <secret> <clientid>
    profileName = null;
    secret = profileOrSecret;
    clientId = secretOrClientId;
  } else {
    console.error('Usage: momo auth <secret> <clientid>');
    console.error('       momo auth <profile-name> <secret> <clientid>');
    process.exit(1);
  }

  const name = saveCredentials(profileName, secret, clientId);
  console.log(`✓ Credentials saved for profile "${name}"`);
}

export async function authStatus() {
  const profiles = listProfiles();

  if (profiles.length === 0) {
    console.log('✗ Not authenticated');
    console.log('  Run: momo auth <secret> <clientid>');
    return;
  }

  console.log('Configured profiles:');
  for (const p of profiles) {
    const marker = p.isDefault ? ' ✓' : '  ';
    const maskedSecret = p.secret.slice(0, 4) + '...' + p.secret.slice(-4);
    console.log(`${marker} ${p.name}`);
    console.log(`    Client ID: ${p.clientId}`);
    console.log(`    Secret: ${maskedSecret}`);
  }
}

export async function authSetDefault(name) {
  try {
    setDefaultProfile(name);
    console.log(`✓ Default profile set to "${name}"`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}

export async function authDelete(name) {
  try {
    deleteProfile(name);
    console.log(`✓ Profile "${name}" deleted`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}

export async function authList() {
  const profiles = listProfiles();
  if (profiles.length === 0) {
    console.log('No profiles configured');
    return;
  }
  for (const p of profiles) {
    const marker = p.isDefault ? '✓ ' : '  ';
    console.log(`${marker}${p.name}  (client: ${p.clientId})`);
  }
}

export async function stopwatchStatus(profileName) {
  const state = await api.getStopwatch(profileName);
  const elapsed = calculateElapsed(state);
  const isRunning = !!state.timestamp;
  const profile = profileName || (getCredentials(profileName)?.name);

  console.log(`Profile: ${profile}`);
  console.log(`Stopwatch: ${formatDuration(elapsed)}`);
  console.log(`Status: ${isRunning ? '▶ Running' : '⏸ Paused'}`);

  if (isRunning && state.timestamp) {
    console.log(`Started: ${new Date(state.timestamp).toLocaleTimeString()}`);
  }
}

export async function stopwatchStart(profileName) {
  await api.startStopwatch(profileName);
  console.log('▶ Stopwatch started');
}

export async function stopwatchPause(profileName) {
  await api.pauseStopwatch(profileName);
  const state = await api.getStopwatch(profileName);
  const elapsed = calculateElapsed(state);
  console.log(`⏸ Stopwatch paused at ${formatDuration(elapsed)}`);
}

export async function stopwatchStop(profileName) {
  await api.stopStopwatch(profileName);
  console.log('⏹ Stopwatch stopped and reset');
}

export async function logTime(args, profileName) {
  let time, project, description;

  if (isTimeFormat(args[0])) {
    time = args[0];
    project = args[1];
    description = args.slice(2).join(' ');

    if (!project) {
      console.error('Usage: momo log [--profile NAME] <HH:MM> <project> <description>');
      process.exit(1);
    }
  } else {
    project = args[0];
    description = args.slice(1).join(' ');

    if (!project) {
      console.error('Usage: momo log [--profile NAME] <project> <description>');
      process.exit(1);
    }

    const state = await api.getStopwatch(profileName);
    const elapsed = calculateElapsed(state);

    if (elapsed < 1) {
      console.error('✗ Stopwatch is empty. Start it first or specify time manually.');
      process.exit(1);
    }

    time = formatDuration(elapsed);
    await api.stopStopwatch(profileName);
  }

  const date = getTodayDate();
  await api.createTimelog(date, time, project, description || '', profileName);

  console.log(`✓ Logged ${time} to "${project}"`);
  if (description) {
    console.log(`  "${description}"`);
  }
}

export async function showStatus(args, profileName) {
  const today = getTodayDate();

  const [timelogs, projects] = await Promise.all([
    api.getTimelogs(today, today, profileName),
    api.listProjects(profileName).catch(() => [])
  ]);

  const projectMap = new Map();
  for (const p of projects) {
    projectMap.set(p.id, p);
  }

  const profile = profileName || (getCredentials(profileName)?.name);
  console.log(`Timelogs for ${today} (profile: ${profile}):`);

  if (!timelogs || timelogs.length === 0) {
    console.log('  No timelogs for today');
    return;
  }

  let totalMinutes = 0;
  const showIds = args.includes('--ids');
  for (const log of timelogs) {
    const [hours, mins] = (log.time || '00:00').split(':').map(Number);
    totalMinutes += hours * 60 + mins;

    let projectLabel = '';
    let colorSwatch = '';
    if (log.typeId && log.type === 'project') {
      const proj = projectMap.get(log.typeId);
      if (proj) {
        colorSwatch = colorize('██', proj.color);
        projectLabel = `[${proj.name}]`;
      }
    }

    const desc = log.description ? `"${log.description}"` : '';
    const idDisplay = showIds ? `(${log.id})` : '';
    const parts = [colorSwatch, log.time, projectLabel, desc, idDisplay].filter(Boolean);
    console.log(`  ${parts.join('  ')}`);
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  console.log(`  ─────────────────────────`);
  console.log(`  ${String(totalHours).padStart(2, '0')}:${String(totalMins).padStart(2, '0')}  TOTAL`);
}

export async function listProjects(profileName) {
  const projects = await api.listProjects(profileName);

  if (!projects || projects.length === 0) {
    console.log('No projects found');
    return;
  }

  console.log('Projects:');
  for (const p of projects) {
    const coloredName = colorize(p.name, p.color);
    const colorHex = p.color ? ` (${p.color})` : '';
    const desc = p.description ? ` - ${p.description}` : '';
    console.log(`  ${coloredName}${colorHex}${desc}`);
  }
}

export async function listColors(profileName) {
  const colors = await api.listColors(profileName);

  if (!colors || colors.length === 0) {
    console.log('No colors available');
    return;
  }

  console.log('Available colors:');
  for (const c of colors) {
    const hex = c.color;
    const swatch = colorize('██', hex);
    console.log(`  ${swatch}  ${hex}`);
  }
}

async function normalizeColor(color, profileName) {
  if (!color) return null;

  if (/^#[A-Fa-f0-9]{6}$/.test(color)) {
    color = color.toLowerCase() + 'ff';
  } else if (/^#[A-Fa-f0-9]{8}$/.test(color)) {
    color = color.toLowerCase();
  } else {
    console.error('Color must be in hex format: #RRGGBB or #RRGGBBAA');
    process.exit(1);
  }

  const availableColors = await api.listColors(profileName);
  const colorHexes = availableColors.map(c => c.color.toLowerCase());
  if (!colorHexes.includes(color.toLowerCase())) {
    console.error(`✗ Color ${color} is not in the allowed list.`);
    console.error('  Run: momo colors');
    process.exit(1);
  }

  return color;
}

export async function addProject(name, options = {}, profileName) {
  if (!name) {
    console.error('Usage: momo project add <name> [--color #hex] [--description "desc"]');
    process.exit(1);
  }

  const color = await normalizeColor(options.color, profileName);
  const project = await api.createProject(name, color, options.description, options.clientId, profileName);

  const coloredName = colorize(project.name, project.color);
  console.log(`✓ Created project: ${coloredName}`);
  if (project.color) {
    console.log(`  Color: ${project.color}`);
  }
}

export async function updateProject(name, options = {}, profileName) {
  if (!name) {
    console.error('Usage: momo project update <name> [--color #hex] [--description "desc"]');
    process.exit(1);
  }

  const projects = await api.listProjects(profileName);
  const project = projects.find(p => p.name.toLowerCase() === name.toLowerCase());

  if (!project) {
    console.error(`✗ Project "${name}" not found`);
    process.exit(1);
  }

  const color = options.color ? await normalizeColor(options.color, profileName) : undefined;

  const updated = await api.updateProject(
    project.id,
    project.name,
    color !== undefined ? color : project.color,
    options.description !== undefined ? options.description : project.description,
    project.clientId,
    profileName
  );

  const coloredName = colorize(updated.name, updated.color);
  console.log(`✓ Updated project: ${coloredName}`);
}

export async function deleteProject(name, options = {}, profileName) {
  if (!name) {
    console.error('Usage: momo project delete <name> [--force]');
    process.exit(1);
  }

  const projects = await api.listProjects(profileName);
  const project = projects.find(p => p.name.toLowerCase() === name.toLowerCase());

  if (!project) {
    console.error(`✗ Project "${name}" not found`);
    process.exit(1);
  }

  if (!options.force) {
    console.log(`⚠ Are you sure you want to delete "${project.name}"?`);
    console.log('  Run with --force to confirm');
    process.exit(1);
  }

  await api.deleteProject(project.id, profileName);
  console.log(`✓ Deleted project: ${project.name}`);
}

export async function deleteTimelog(id, options = {}, profileName) {
  if (!id) {
    console.error('Usage: momo timelog delete <id> [--force]');
    console.error('  Get IDs from: momo status --ids');
    process.exit(1);
  }

  if (!options.force) {
    console.log(`⚠ Are you sure you want to delete timelog ${id}?`);
    console.log('  Run with --force to confirm');
    process.exit(1);
  }

  await api.deleteTimelog(id, profileName);
  console.log(`✓ Deleted timelog: ${id}`);
}

export function showHelp() {
  console.log(`
momo - CLI for momo.coach time tracking

Authentication:
  momo auth <secret> <clientid>           Store credentials (default profile)
  momo auth <name> <secret> <clientid>    Store credentials for a named profile
  momo auth status                        Show all configured profiles
  momo auth list                          List profile names
  momo auth default <name>                Set default profile
  momo auth delete <name>                 Delete a profile

Stopwatch:
  momo sw [--profile NAME]               Show stopwatch status
  momo sw start [--profile NAME]          Start the stopwatch
  momo sw pause [--profile NAME]          Pause the stopwatch
  momo sw stop [--profile NAME]           Stop and reset stopwatch

Time Logging:
  momo log [--profile NAME] <project> <desc>        Log stopwatch time
  momo log [--profile NAME] HH:MM <project> <desc>  Log time manually

Status:
  momo status [--profile NAME]              Show today's timelogs
  momo status --ids [--profile NAME]        Show timelogs with IDs
  momo timelog delete <id> [--force] [--profile NAME]

Projects:
  momo project list [--profile NAME]         List all projects
  momo project add <name> [--color #hex] [--profile NAME]
  momo project update <name> [--color #hex] [--profile NAME]
  momo project delete <name> [--force] [--profile NAME]
  momo colors [--profile NAME]              Show available colors

Options:
  --profile NAME    Use a specific profile (default: uses default profile)
  --force           Confirm destructive actions without prompt

Environment:
  MOMO_PROFILE      Default profile name (overrides config default)

Examples:
  momo auth paul abc123 my-client-id       # Add "paul" profile
  momo auth boris def456 other-client-id   # Add "boris" profile
  momo auth default paul                   # Set paul as default
  momo sw start                            # Start (uses default profile)
  momo status --profile paul               # Check paul's logs
  momo log inxdays "Fixed a bug"           # Log to default profile
  momo log --profile paul 01:30 inxdays "Work"  # Log to paul's account
`.trim());
}
