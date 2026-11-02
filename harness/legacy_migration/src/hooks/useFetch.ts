// SAMPLE
import { request } from '../utils/http';

export function useFetch(url: string): Promise<unknown> {
  return request(url);
}
