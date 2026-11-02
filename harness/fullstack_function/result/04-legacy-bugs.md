# 04. 그대로 옮긴 레거시 버그

원칙: 마이그레이션은 동작을 바꾸지 않음. 아래 버그는 기준선 테스트에 박제되어 있음. 고치려면 **별도 작업**으로 하고, 그때 기준선 테스트도 함께 갱신해야 함.

| # | 위치 | 증상 | 원인 | 흔적 |
|---|---|---|---|---|
| 1 | `UserCard` | `"undefined 2024-05-06"`이 나옴 | `useAuth`가 Promise를 돌려주는데 await하지 않음. Promise는 truthy이고 `.name`은 undefined임 | `as unknown as { name: string }` |
| 2 | `UserList` | `TypeError` | Promise에 `.map`을 호출함 | `as unknown as {...}[]` |
| 3 | `Dashboard` | `TypeError` | #2가 전파됨 | `as unknown as string` |
| 4 | `Profile` | `"undefined …[object Promise]"` | 문자열과 Promise를 이어 붙임 | `as unknown as string` |
| 5 | `Settings` | `"undefined …[object Promise]Footer"` | #4가 전파됨 | – |
| 6 | `cyclic-a/b` | `RangeError` (스택 오버플로) | 종료 조건 없는 상호 재귀 | – |
| 7 | `post` | body가 없으면 `body: undefined`로 fetch를 호출함 | 인자 검증 없음 | – |
| 8 | `formatMoney` | `1.005` → `"1.00"`, `-0.001` → `"-0.00"` | `toFixed`의 부동소수 반올림 | – |

- 근본 원인은 #1~#5가 같음. 비동기 API(`request`)를 동기처럼 쓰고 있음. 고치려면 컴포넌트 계층 전체를 async로 바꿔야 함.
