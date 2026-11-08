// SAMPLE
export function request(path: string): Promise<unknown> {
  return fetch(path).then(r => r.json());
}

export function post(path: string, body: unknown): Promise<Response> {
  return fetch(path, { method: 'POST', body: JSON.stringify(body) });
}
