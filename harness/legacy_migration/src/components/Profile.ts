// SAMPLE
import { UserCard } from './UserCard';
import { SessionContext } from '../context/SessionContext';

export function Profile(): string {
  const id = 1;
  return UserCard({ id }) + (SessionContext.useAuth(id) as unknown as string);
}
