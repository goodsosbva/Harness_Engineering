// SAMPLE
import { formatDate } from '../utils/format';

export function Header(): string {
  return 'Header ' + formatDate(new Date());
}
