import { describe, it, expect } from 'vitest';
import { fromA } from '../../src/cyclic-a';
import { fromB } from '../../src/cyclic-b';

describe('cyclic', () => {
  it('fromA overflows the stack', () => expect(() => fromA()).toThrow(RangeError));
  it('fromB overflows the stack', () => expect(() => fromB()).toThrow(RangeError));
});
