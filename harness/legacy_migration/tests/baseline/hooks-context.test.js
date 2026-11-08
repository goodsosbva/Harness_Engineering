import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuth } from '../../src/hooks/useAuth';
import { SessionContext } from '../../src/context/SessionContext';

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ name: 'Ann' }) }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('useAuth', () => {
  it('fetches /users/:id and resolves the user', async () => {
    await expect(useAuth(3)).resolves.toEqual({ name: 'Ann' });
    expect(fetchMock.mock.calls[0]).toEqual(['/users/3']);
  });
});

describe('SessionContext', () => {
  it('exposes useAuth by identity', () => {
    expect(SessionContext.useAuth).toBe(useAuth);
    expect(Object.keys(SessionContext)).toEqual(['useAuth']);
  });
});
