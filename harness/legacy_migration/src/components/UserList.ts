// SAMPLE
import { UserCard } from './UserCard';
import { listUsers } from '../utils/api';

export function UserList(): (string | null)[] {
  const users = listUsers() as unknown as { id: string | number }[];
  return users.map(u => UserCard({ id: u.id }));
}
