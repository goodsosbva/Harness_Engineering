// SAMPLE
export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatMoney(n: number): string {
  return n.toFixed(2);
}
