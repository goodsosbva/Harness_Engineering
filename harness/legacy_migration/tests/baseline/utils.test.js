import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request, post } from '../../src/utils/http';
import { getUser, listUsers } from '../../src/utils/api';
import { useFetch } from '../../src/hooks/useFetch';
import { formatDate, formatMoney } from '../../src/utils/format';
import { VERSION } from '../../src/standalone';
import { Footer } from '../../src/components/Footer';

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ ok: 1 }) }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('http', () => {
  it('request calls fetch(path) with a single arg and returns parsed json', async () => {
    await expect(request('/x')).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]).toEqual(['/x']);
  });
  it('post calls fetch with POST + JSON body and returns the raw fetch promise', async () => {
    const res = await post('/p', { a: 1 });
    expect(fetchMock).toHaveBeenCalledWith('/p', { method: 'POST', body: '{"a":1}' });
    expect(typeof res.json).toBe('function');
  });
  it('post with undefined body passes body undefined', () => {
    post('/p');
    expect(fetchMock).toHaveBeenCalledWith('/p', { method: 'POST', body: undefined });
  });
});

describe('api', () => {
  it('getUser requests /users/:id', async () => {
    await expect(getUser(5)).resolves.toEqual({ ok: 1 });
    expect(fetchMock.mock.calls[0]).toEqual(['/users/5']);
  });
  it('getUser(undefined) requests /users/undefined', () => {
    getUser();
    expect(fetchMock.mock.calls[0]).toEqual(['/users/undefined']);
  });
  it('listUsers requests /users', async () => {
    await listUsers();
    expect(fetchMock.mock.calls[0]).toEqual(['/users']);
  });
});

describe('useFetch', () => {
  it('delegates to fetch(url)', async () => {
    await expect(useFetch('/u')).resolves.toEqual({ ok: 1 });
    expect(fetchMock.mock.calls[0]).toEqual(['/u']);
  });
});

describe('format', () => {
  it('formatDate returns UTC yyyy-mm-dd', () => {
    expect(formatDate(new Date('2024-03-05T23:59:59Z'))).toBe('2024-03-05');
  });
  it('formatDate throws on non-date', () => {
    expect(() => formatDate('2024-01-01')).toThrow(TypeError);
  });
  it('formatDate throws RangeError on invalid date', () => {
    expect(() => formatDate(new Date('x'))).toThrow(RangeError);
  });
  it('formatMoney uses toFixed(2)', () => {
    expect(formatMoney(1)).toBe('1.00');
    expect(formatMoney(1.005)).toBe('1.00');
    expect(formatMoney(-0.001)).toBe('-0.00');
  });
  it('formatMoney throws on string', () => {
    expect(() => formatMoney('1')).toThrow(TypeError);
  });
});

describe('standalone leaves', () => {
  it('VERSION', () => expect(VERSION).toBe('1.0.0'));
  it('Footer', () => expect(Footer()).toBe('Footer'));
});
