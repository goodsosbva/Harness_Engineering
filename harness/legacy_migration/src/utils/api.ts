// SAMPLE
import { request } from './http';

export function getUser(id: string | number): Promise<unknown> {
  return request(`/users/${id}`);
}

export function listUsers(): Promise<unknown> {
  return request('/users');
}
