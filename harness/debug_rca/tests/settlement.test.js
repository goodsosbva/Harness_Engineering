import { describe, it, expect } from 'vitest';
import { businessDate, cutoffLabel } from '../src/settlement';

describe('정산 마감일', () => {
  it('한국 시간 자정 직후 거래는 그날로 마감된다', () => {
    expect(businessDate('2026-11-01T00:30:00+09:00')).toBe('2026-11-01');
  });
  it('마감 라벨', () => {
    expect(cutoffLabel('2026-11-01T00:30:00+09:00')).toBe('2026-11-01 마감');
  });
});
