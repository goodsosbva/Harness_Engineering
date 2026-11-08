// SAMPLE
import { fromA } from './cyclic-a';

export function fromB(): string {
  return fromA() + 'B';
}
