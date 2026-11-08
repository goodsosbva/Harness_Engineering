// SAMPLE
import { getUser } from '../utils/api';

export function useAuth(id: string | number): Promise<unknown> {
  return getUser(id);
}
