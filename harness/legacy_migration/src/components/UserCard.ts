// SAMPLE
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/format';

export function UserCard({ id }: { id: string | number }): string | null {
  const user = useAuth(id) as unknown as { name: string };
  return user ? user.name + ' ' + formatDate(new Date()) : null;
}
