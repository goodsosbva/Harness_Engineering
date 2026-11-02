# BUG-001 유사 패턴 목록 (수정하지 않음)

검색: `grep -rnE "get(FullYear|Month|Date|Day|Hours|Minutes)\(|new Date\(|toLocale(Date)?String\(|setHours\(" src tests`

| 위치 | 코드 | 위험 | 권고 |
|---|---|---|---|
| src/invoice.js:3-4 | `d.getFullYear()`, `d.getMonth()+1`, `d.getDate()` | **동일 결함.** 청구서 발행일이 UTC 환경에서 KST 00:00~08:59 발행분에 하루 전으로 표시됨 | `Intl.DateTimeFormat('ko-KR' 또는 'en-CA', {timeZone:'Asia/Seoul'})`로 교체, 같은 TZ 회귀 테스트 추가 |
| src/settlement.js:6 | `fmt.format(new Date(isoString))` | 안전 (timeZone 명시된 포매터) | — |

총 1건 조치 필요 (invoice.js). 별도 버그 티켓 권장.
