// 정산 마감일 계산 — 업무 기준 시간대는 프로세스 TZ와 무관하게 Asia/Seoul
const BUSINESS_TZ = 'Asia/Seoul';
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ }); // YYYY-MM-DD

export function businessDate(isoString) {
  return fmt.format(new Date(isoString));
}

export function cutoffLabel(isoString) {
  return `${businessDate(isoString)} 마감`;
}
