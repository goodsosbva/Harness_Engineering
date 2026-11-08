# 03. 배치 상세

| ID | 파일 | depends_on | 복잡도 | 판정 | 시도 |
|---|---|---|---|---|---|
| B1 | utils/http, utils/api, hooks/useFetch | – | 26.75 | ✅ verified | 1 |
| B2 | utils/format, hooks/useAuth, context/SessionContext | B1 | 16.45 | ✅ verified | 1 |
| B3 | components/UserCard, components/Header | B2 | 15.62 | ✅ verified | 1 |
| B4 | components/UserList, components/Profile | B1, B2, B3 | 21.13 | ✅ verified | 1 |
| B5 | pages/Dashboard, pages/Settings | B3, B4, B7 | 17.42 | ✅ verified | 1 |
| B6 ⚠️cyclic | cyclic-a, cyclic-b | – | 11.98 | ✅ verified | 1 |
| B7 | components/Footer, standalone | – | 4.0 | ✅ verified | 1 |
| – | truncated.jsx | – | – | 📝 manual-queue | – |

## 변환 후 시그니처

| 파일 | 시그니처 | 비고 |
|---|---|---|
| utils/http.ts | `request(path: string): Promise<unknown>`<br>`post(path: string, body: unknown): Promise<Response>` | `r.json()`이 any라 unknown으로 둠 |
| utils/api.ts | `getUser(id: string \| number): Promise<unknown>`<br>`listUsers(): Promise<unknown>` | id 타입은 추정값 |
| hooks/useFetch.ts | `useFetch(url: string): Promise<unknown>` | |
| utils/format.ts | `formatDate(d: Date): string`<br>`formatMoney(n: number): string` | |
| hooks/useAuth.ts | `useAuth(id: string \| number): Promise<unknown>` | |
| context/SessionContext.ts | `{ useAuth }` (추론) | 순수 rename |
| components/UserCard.ts | `UserCard({ id }: { id: string \| number }): string \| null` | `as unknown as { name: string }` 단언 |
| components/Header.ts | `Header(): string` | |
| components/UserList.ts | `UserList(): (string \| null)[]` | `as unknown as { id: string \| number }[]` 단언 |
| components/Profile.ts | `Profile(): string` | `as unknown as string` 단언 |
| pages/Dashboard.ts | `Dashboard(): string` | `UserList() as unknown as string` 단언 |
| pages/Settings.ts | `Settings(): string` | |
| cyclic-a.ts / cyclic-b.ts | `fromA(): string` / `fromB(): string` | 무한 재귀 유지 |
| components/Footer.ts | `Footer(): string` | |
| standalone.ts | `VERSION` (추론) | 순수 rename |

> `as unknown as` 단언은 **레거시 버그를 런타임에서 그대로 유지하면서** strict 타입 검사를 통과시키려고 넣었음. 컴파일 때 지워지므로 동작에는 영향이 없음. 버그를 고치면 함께 없어질 표시이기도 함. [04-legacy-bugs.md](04-legacy-bugs.md) 참고.
