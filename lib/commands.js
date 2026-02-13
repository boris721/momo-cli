import { saveConfig, loadConfig, hasCredentials } from './config.js';
import * as api from './api.js';
import { formatDuration, parseTime, isTimeFormat, getTodayDate, calculateElapsed } from './format.js';

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
  console.log('Today\'s timelogs:');
  console.log('  (API does not support listing timelogs yet)');
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
  momo help                       Show this help message

Examples:
  momo auth abc123 my-client-id
  momo sw start
  momo sw
  momo log myproject "Fixed the bug"
  momo log 01:30 myproject "Manual entry"
`.trim());
}
