// Format duration in minutes to HH:MM
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Parse HH:MM to minutes
export function parseTime(timeStr) {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  const hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) {
    return null;
  }
  return hours * 60 + mins;
}

// Check if string looks like a time HH:MM
export function isTimeFormat(str) {
  return /^\d{1,2}:\d{2}$/.test(str);
}

// Get today's date as YYYY-MM-DD
export function getTodayDate() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// Calculate elapsed time from stopwatch state
export function calculateElapsed(state) {
  if (!state) return 0;
  
  let elapsed = state.duration || 0;
  
  // If running (has timestamp), add time since timestamp
  if (state.timestamp) {
    const now = Date.now();
    const started = new Date(state.timestamp).getTime();
    const running = (now - started) / 1000 / 60; // minutes
    elapsed += running;
  }
  
  return elapsed;
}
