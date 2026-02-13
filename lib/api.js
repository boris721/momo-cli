import { loadConfig } from './config.js';

const BASE_URL = 'https://api.momo.coach';
const USER_AGENT = 'momo-cli@1.0.0';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getHeaders() {
  const config = loadConfig();
  if (!config || !config.secret || !config.clientId) {
    throw new ApiError('Not authenticated. Run: momo auth <secret> <clientid>', 401);
  }
  return {
    'Authorization': `Bearer ${config.secret}`,
    'Clientid': config.clientId,
    'User-Agent': USER_AGENT,
    'Content-Type': 'application/json'
  };
}

async function request(method, path, body = null) {
  const headers = getHeaders();
  const options = { method, headers };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const res = await fetch(`${BASE_URL}${path}`, options);
  
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(`API error: ${res.status} - ${text}`, res.status);
  }
  
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

// Stopwatch endpoints
export async function getStopwatch() {
  return request('GET', '/stopwatch');
}

export async function startStopwatch() {
  return request('POST', '/stopwatch');
}

export async function pauseStopwatch() {
  return request('PUT', '/stopwatch');
}

export async function stopStopwatch() {
  return request('DELETE', '/stopwatch');
}

// Time logging
export async function createTimelog(date, time, label, description) {
  return request('POST', '/time', {
    date,
    time,
    label,
    description
  });
}
