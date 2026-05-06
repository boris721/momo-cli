import { getCredentials } from './config.js';

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
const VERSION = pkg.version;

const BASE_URL = 'https://api.momo.coach';
const USER_AGENT = `momo-cli@${VERSION}`;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function resolveCredentials(profileName) {
  const creds = getCredentials(profileName);
  if (!creds || !creds.secret || !creds.clientId) {
    const profileInfo = profileName ? ` (profile: ${profileName})` : '';
    throw new ApiError(`Not authenticated${profileInfo}. Run: momo auth <profile> <secret> <clientid>`, 401);
  }
  return creds;
}

function getHeaders(profileName) {
  const creds = resolveCredentials(profileName);
  return {
    'Authorization': `Bearer ${creds.secret}`,
    'Clientid': creds.clientId,
    'User-Agent': USER_AGENT,
    'Content-Type': 'application/json'
  };
}

async function request(method, path, body = null, profileName = null) {
  const headers = getHeaders(profileName);
  const options = { method, headers };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, options);

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(`API error: ${res.status} - ${text}`, res.status);
  }

  const text = await res.text();
  if (!text) return null;

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return JSON.parse(text);
  }
  return text;
}

// Stopwatch endpoints
export async function getStopwatch(profileName) {
  return request('GET', '/stopwatch', null, profileName);
}

export async function startStopwatch(profileName) {
  return request('POST', '/stopwatch', null, profileName);
}

export async function pauseStopwatch(profileName) {
  return request('PUT', '/stopwatch', null, profileName);
}

export async function stopStopwatch(profileName) {
  return request('DELETE', '/stopwatch', null, profileName);
}

// Time logging
export async function createTimelog(date, time, label, description, profileName) {
  return request('POST', '/time', {
    date,
    time,
    label,
    description
  }, profileName);
}

// Get timelogs for date range
export async function getTimelogs(from, to, profileName) {
  return request('GET', `/time/range/from/${from}/to/${to}`, null, profileName);
}

// Color endpoints
export async function listColors(profileName) {
  return request('GET', '/color', null, profileName);
}

// Project endpoints
export async function listProjects(profileName) {
  return request('GET', '/project', null, profileName);
}

export async function getProject(id, profileName) {
  return request('GET', `/project/${id}`, null, profileName);
}

export async function createProject(name, color, description, clientId, profileName) {
  const body = { name };
  if (color) body.color = color;
  if (description) body.description = description;
  if (clientId) body.clientId = clientId;
  return request('POST', '/project', body, profileName);
}

export async function updateProject(id, name, color, description, clientId, profileName) {
  const body = { id, name };
  if (color !== undefined) body.color = color;
  if (description !== undefined) body.description = description;
  if (clientId !== undefined) body.clientId = clientId;
  return request('PUT', '/project', body, profileName);
}

export async function deleteProject(id, profileName) {
  return request('POST', '/project/delete', { id }, profileName);
}

// Timelog endpoints
export async function deleteTimelog(id, profileName) {
  return request('POST', '/time/delete', { id }, profileName);
}
