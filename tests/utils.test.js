import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import escapeRegex from '../utils/escapeRegex.js';
import errorHandler from '../utils/errorHandler.js';

describe('escapeRegex', () => {
  it('escapes special regex characters', () => {
    assert.equal(escapeRegex('hello.world'), 'hello\\.world');
    assert.equal(escapeRegex('test*query'), 'test\\*query');
  });
});

describe('errorHandler', () => {
  it('creates an error with message and statusCode', () => {
    const err = errorHandler('Unauthorized', 401);
    assert.equal(err.message, 'Unauthorized');
    assert.equal(err.statusCode, 401);
  });
});
