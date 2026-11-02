import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserCard } from '../../src/components/UserCard';
import { Header } from '../../src/components/Header';
import { UserList } from '../../src/components/UserList';
import { Profile } from '../../src/components/Profile';
import { Dashboard } from '../../src/pages/Dashboard';
import { Settings } from '../../src/pages/Settings';

let fetchMock;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2024-05-06T12:00:00Z'));
  fetchMock = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ name: 'Ann' }) }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Header', () => {
  it('prefixes today formatted date', () => expect(Header()).toBe('Header 2024-05-06'));
});

describe('UserCard', () => {
  // BUG recorded: useAuth returns a Promise (truthy), so user.name is undefined
  it('renders "undefined <date>" because user is a Promise', () => {
    expect(UserCard({ id: 1 })).toBe('undefined 2024-05-06');
    expect(fetchMock.mock.calls[0]).toEqual(['/users/1']);
  });
  it('throws without props', () => {
    expect(() => UserCard()).toThrow(TypeError);
  });
});

describe('UserList', () => {
  // BUG recorded: listUsers returns a Promise, which has no .map
  it('throws TypeError (promise.map is not a function)', () => {
    expect(() => UserList()).toThrow(TypeError);
    expect(fetchMock.mock.calls[0]).toEqual(['/users']);
  });
});

describe('Profile', () => {
  // BUG recorded: string + Promise concatenation
  it('returns card text + "[object Promise]"', () => {
    expect(Profile()).toBe('undefined 2024-05-06[object Promise]');
    expect(fetchMock.mock.calls.map(c => c[0])).toEqual(['/users/1', '/users/1']);
  });
});

describe('Dashboard', () => {
  it('throws because UserList throws', () => {
    expect(() => Dashboard()).toThrow(TypeError);
  });
});

describe('Settings', () => {
  it('Profile + Footer', () => {
    expect(Settings()).toBe('undefined 2024-05-06[object Promise]Footer');
  });
});
