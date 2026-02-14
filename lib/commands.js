import { saveConfig, loadConfig, hasCredentials } from './config.js';
import * as api from './api.js';
import { formatDuration, parseTime, isTimeFormat, getTodayDate, calculateElapsed } from './format.js';

// ANSI color utilities
function hexToAnsi(hex) {
  if (!hex) return null;
  // Parse #RRGGBBAA format
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

export async function authSave(secret, clientId) {
  saveConfig({ secret, clientId });
  console.log('✓ Credentials saved');
}

export async function authStatus() {
  const config = loadConfig();
  if (!config || !config.secret || !config.clientId) {
    console.log('✗ Not authenticated');
    console.log('  Run: momo auth <secret> <clientid>');
    return;
  }
  
  // Mask credentials
  const maskedSecret = config.secret.slice(0, 4) + '...' + config.secret.slice(-4);
  console.log('✓ Authenticated');
  console.log(`  Client ID: ${config.clientId}`);
  console.log(`  Secret: ${maskedSecret}`);
}

export async function stopwatchStatus() {
  const state = await api.getStopwatch();
  const elapsed = calculateElapsed(state);
  const isRunning = !!state.timestamp;
  
  console.log(`Stopwatch: ${formatDuration(elapsed)}`);
  console.log(`Status: ${isRunning ? '▶ Running' : '⏸ Paused'}`);
  
  if (isRunning && state.timestamp) {
    console.log(`Started: ${new Date(state.timestamp).toLocaleTimeString()}`);
  }
}

export async function stopwatchStart() {
  await api.startStopwatch();
  console.log('▶ Stopwatch started');
}

export async function stopwatchPause() {
  await api.pauseStopwatch();
  const state = await api.getStopwatch();
  const elapsed = calculateElapsed(state);
  console.log(`⏸ Stopwatch paused at ${formatDuration(elapsed)}`);
}

export async function stopwatchStop() {
  await api.stopStopwatch();
  console.log('⏹ Stopwatch stopped and reset');
}

export async function logTime(args) {
  let time, project, description;
  
  // Check if first arg is a time format
  if (isTimeFormat(args[0])) {
    // Manual time entry: momo log HH:MM project description
    time = args[0];
    project = args[1];
    description = args.slice(2).join(' ');
    
    if (!project) {
      console.error('Usage: momo log <HH:MM> <project> <description>');
      process.exit(1);
    }
  } else {
    // Use stopwatch: momo log project description
    project = args[0];
    description = args.slice(1).join(' ');
    
    if (!project) {
      console.error('Usage: momo log <project> <description>');
      process.exit(1);
    }
    
    // Get stopwatch value
    const state = await api.getStopwatch();
    const elapsed = calculateElapsed(state);
    
    if (elapsed < 1) {
      console.error('✗ Stopwatch is empty. Start it first or specify time manually.');
      process.exit(1);
    }
    
    time = formatDuration(elapsed);
    
    // Stop and reset stopwatch
    await api.stopStopwatch();
  }
  
  const date = getTodayDate();
  await api.createTimelog(date, time, project, description || '');
  
  console.log(`✓ Logged ${time} to "${project}"`);
  if (description) {
    console.log(`  "${description}"`);
  }
}

export async function showStatus() {
  const today = getTodayDate();
  
  // Fetch timelogs and projects in parallel
  const [timelogs, projects] = await Promise.all([
    api.getTimelogs(today, today),
    api.listProjects().catch(() => []) // fallback if projects endpoint not available
  ]);
  
  // Build project lookup map
  const projectMap = new Map();
  for (const p of projects) {
    projectMap.set(p.id, p);
  }
  
  console.log(`Timelogs for ${today}:`);
  
  if (!timelogs || timelogs.length === 0) {
    console.log('  No timelogs for today');
    return;
  }
  
  let totalMinutes = 0;
  for (const log of timelogs) {
    const [hours, mins] = (log.time || '00:00').split(':').map(Number);
    totalMinutes += hours * 60 + mins;
    
    // Get project info if available
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
    const parts = [colorSwatch, log.time, projectLabel, desc].filter(Boolean);
    console.log(`  ${parts.join('  ')}`);
  }
  
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  console.log(`  ─────────────────────────`);
  console.log(`  ${String(totalHours).padStart(2, '0')}:${String(totalMins).padStart(2, '0')}  TOTAL`);
}

export async function listProjects() {
  const projects = await api.listProjects();
  
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

export async function listColors() {
  const colors = await api.listColors();
  
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

// Helper to normalize and validate color
async function normalizeColor(color) {
  if (!color) return null;
  
  // If 6-char hex, add alpha (lowercase to match API format)
  if (/^#[A-Fa-f0-9]{6}$/.test(color)) {
    color = color.toLowerCase() + 'ff';
  } else if (/^#[A-Fa-f0-9]{8}$/.test(color)) {
    color = color.toLowerCase();
  } else {
    console.error('Color must be in hex format: #RRGGBB or #RRGGBBAA');
    process.exit(1);
  }
  
  // Validate against available colors
  const availableColors = await api.listColors();
  const colorHexes = availableColors.map(c => c.color.toLowerCase());
  if (!colorHexes.includes(color.toLowerCase())) {
    console.error(`✗ Color ${color} is not in the allowed list.`);
    console.error('  Run: momo colors');
    process.exit(1);
  }
  
  return color;
}

export async function addProject(name, options = {}) {
  if (!name) {
    console.error('Usage: momo project add <name> [--color #hex] [--description "desc"]');
    process.exit(1);
  }
  
  const color = await normalizeColor(options.color);
  
  const project = await api.createProject(name, color, options.description, options.clientId);
  
  const coloredName = colorize(project.name, project.color);
  console.log(`✓ Created project: ${coloredName}`);
  if (project.color) {
    console.log(`  Color: ${project.color}`);
  }
}

export async function updateProject(name, options = {}) {
  if (!name) {
    console.error('Usage: momo project update <name> [--color #hex] [--description "desc"]');
    process.exit(1);
  }
  
  // Find project by name
  const projects = await api.listProjects();
  const project = projects.find(p => p.name.toLowerCase() === name.toLowerCase());
  
  if (!project) {
    console.error(`✗ Project "${name}" not found`);
    console.error('  Run: momo project list');
    process.exit(1);
  }
  
  const color = options.color ? await normalizeColor(options.color) : undefined;
  
  const updated = await api.updateProject(
    project.id,
    project.name,
    color !== undefined ? color : project.color,
    options.description !== undefined ? options.description : project.description,
    project.clientId
  );
  
  const coloredName = colorize(updated.name, updated.color);
  console.log(`✓ Updated project: ${coloredName}`);
  if (updated.color) {
    console.log(`  Color: ${updated.color}`);
  }
}

export async function deleteProject(name, options = {}) {
  if (!name) {
    console.error('Usage: momo project delete <name> [--force]');
    process.exit(1);
  }
  
  // Find project by name
  const projects = await api.listProjects();
  const project = projects.find(p => p.name.toLowerCase() === name.toLowerCase());
  
  if (!project) {
    console.error(`✗ Project "${name}" not found`);
    console.error('  Run: momo project list');
    process.exit(1);
  }
  
  // Confirm deletion unless --force
  if (!options.force) {
    console.log(`⚠ Are you sure you want to delete "${project.name}"?`);
    console.log('  Run with --force to confirm');
    process.exit(1);
  }
  
  await api.deleteProject(project.id);
  console.log(`✓ Deleted project: ${project.name}`);
}

export async function deleteTimelog(id, options = {}) {
  if (!id) {
    console.error('Usage: momo timelog delete <id> [--force]');
    console.error('  Get IDs from: momo status --ids');
    process.exit(1);
  }
  
  // Confirm deletion unless --force
  if (!options.force) {
    console.log(`⚠ Are you sure you want to delete timelog ${id}?`);
    console.log('  Run with --force to confirm');
    process.exit(1);
  }
  
  await api.deleteTimelog(id);
  console.log(`✓ Deleted timelog: ${id}`);
}

export async function showStatusWithIds() {
  const today = getTodayDate();
  
  const [timelogs, projects] = await Promise.all([
    api.getTimelogs(today, today),
    api.listProjects().catch(() => [])
  ]);
  
  const projectMap = new Map();
  for (const p of projects) {
    projectMap.set(p.id, p);
  }
  
  console.log(`Timelogs for ${today}:`);
  
  if (!timelogs || timelogs.length === 0) {
    console.log('  No timelogs for today');
    return;
  }
  
  let totalMinutes = 0;
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
    const idShort = log.id.slice(0, 8);
    const parts = [colorSwatch, log.time, projectLabel, desc, `(${idShort}...)`].filter(Boolean);
    console.log(`  ${parts.join('  ')}`);
  }
  
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  console.log(`  ─────────────────────────`);
  console.log(`  ${String(totalHours).padStart(2, '0')}:${String(totalMins).padStart(2, '0')}  TOTAL`);
}

export function showHelp() {
  console.log(`
momo - CLI for momo.coach time tracking

Commands:
  momo auth <secret> <clientid>   Store API credentials
  momo auth status                Show authentication status

  momo sw                         Show stopwatch status
  momo sw start                   Start the stopwatch
  momo sw pause                   Pause the stopwatch
  momo sw stop                    Stop and reset stopwatch

  momo log <project> <desc>       Log stopwatch time to project
  momo log <HH:MM> <project> <desc>  Log specific time manually

  momo status                     Show today's timelogs
  momo status --ids               Show timelogs with IDs (for deletion)
  momo timelog delete <id>        Delete a timelog
    --force                         Confirm deletion
  momo colors                     Show available colors for projects

  momo project list               List all projects with colors
  momo project add <name>         Create a new project
    --color #RRGGBB                 Set project color (from allowed list)
    --description "text"            Set project description
  momo project update <name>      Update an existing project
    --color #RRGGBB                 Set new color
    --description "text"            Set new description
  momo project delete <name>      Delete a project
    --force                         Confirm deletion

  momo help                       Show this help message
  momo --version                  Show version

Examples:
  momo auth abc123 my-client-id
  momo sw start
  momo sw
  momo log myproject "Fixed the bug"
  momo log 01:30 myproject "Manual entry"
  momo project list
  momo project add "New Project" --color #FF5733
  momo project update boris --color #0c71e7
  momo project delete "Old Project" --force
`.trim());
}
