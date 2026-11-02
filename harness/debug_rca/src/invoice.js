// 청구서 발행일 표시
export function issuedOn(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}
