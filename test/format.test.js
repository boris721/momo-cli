import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatDuration, parseTime, isTimeFormat, calculateElapsed } from '../lib/format.js';

describe('formatDuration', () => {
  it('formats 0 minutes as 00:00', () => {
    assert.strictEqual(formatDuration(0), '00:00');
  });
  
  it('formats 90 minutes as 01:30', () => {
    assert.strictEqual(formatDuration(90), '01:30');
  });
  
  it('formats 5 minutes as 00:05', () => {
    assert.strictEqual(formatDuration(5), '00:05');
  });
  
  it('formats 125 minutes as 02:05', () => {
    assert.strictEqual(formatDuration(125), '02:05');
  });
  
  it('handles fractional minutes by rounding', () => {
    assert.strictEqual(formatDuration(90.7), '01:31');
  });
});

describe('parseTime', () => {
  it('parses 01:30 to 90 minutes', () => {
    assert.strictEqual(parseTime('01:30'), 90);
  });
  
  it('parses 0:05 to 5 minutes', () => {
    assert.strictEqual(parseTime('0:05'), 5);
  });
  
  it('parses 23:59 correctly', () => {
    assert.strictEqual(parseTime('23:59'), 23 * 60 + 59);
  });
  
  it('returns null for invalid format', () => {
    assert.strictEqual(parseTime('invalid'), null);
  });
  
  it('returns null for out of range hours', () => {
    assert.strictEqual(parseTime('25:00'), null);
  });
  
  it('returns null for out of range minutes', () => {
    assert.strictEqual(parseTime('12:60'), null);
  });
});

describe('isTimeFormat', () => {
  it('returns true for valid time format', () => {
    assert.strictEqual(isTimeFormat('01:30'), true);
    assert.strictEqual(isTimeFormat('1:30'), true);
    assert.strictEqual(isTimeFormat('12:00'), true);
  });
  
  it('returns false for invalid format', () => {
    assert.strictEqual(isTimeFormat('project'), false);
    assert.strictEqual(isTimeFormat('1:3'), false);
    assert.strictEqual(isTimeFormat('12:345'), false);
  });
});

describe('calculateElapsed', () => {
  it('returns 0 for null state', () => {
    assert.strictEqual(calculateElapsed(null), 0);
  });
  
  it('returns duration when paused (no timestamp)', () => {
    assert.strictEqual(calculateElapsed({ duration: 30 }), 30);
  });
  
  it('adds running time when timestamp present', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const state = { duration: 10, timestamp: fiveMinutesAgo };
    const elapsed = calculateElapsed(state);
    // Should be ~15 minutes (10 + ~5)
    assert.ok(elapsed >= 14.9 && elapsed <= 15.1, `Expected ~15, got ${elapsed}`);
  });
});
