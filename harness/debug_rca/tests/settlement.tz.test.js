import { describe, it, expect, afterEach } from 'vitest';
import { businessDate } from '../src/settlement';

// 실행 머신 TZ와 무관하게 Seoul 기준이어야 한다 (BUG-001 회귀)
const origTZ = process.env.TZ;
afterEach(() => {
  if (origTZ === undefined) delete process.env.TZ; else process.env.TZ = origTZ;
});

describe.each(['UTC', 'America/Los_Angeles', 'Asia/Seoul'])('TZ=%s', (tz) => {
  it('UTC 15:00 직전/직후가 Seoul 날짜 경계를 따른다', () => {
    process.env.TZ = tz;
    expect(businessDate('2026-10-31T14:59:59Z')).toBe('2026-10-31');
    expect(businessDate('2026-10-31T15:00:00Z')).toBe('2026-11-01');
    expect(businessDate('2026-11-01T00:30:00+09:00')).toBe('2026-11-01');
  });
});
