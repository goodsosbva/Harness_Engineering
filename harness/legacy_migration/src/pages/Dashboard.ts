// SAMPLE
import { UserList } from '../components/UserList';
import { Header } from '../components/Header';

export function Dashboard(): string {
  return Header() + (UserList() as unknown as string);
}
