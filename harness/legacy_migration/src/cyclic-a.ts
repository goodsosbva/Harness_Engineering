// SAMPLE
import { fromB } from './cyclic-b';

export function fromA(): string {
  return fromB() + 'A';
}
