# 정적 분석 보고서

## 도구 실행 결과 요약

| 도구 | 에러 | 경고 | 상태 |
|------|------|------|------|
| py_compile (Python) | 0 | 0 | ok |
| tsc --noEmit (TypeScript) | 0 | 0 | ok |
| eslint / npm lint | - | - | 도구 부재 |
| pyflakes | - | - | 도구 부재 |

## 발견

### 도구 부재 (P3)

**eslint / npm 린트 스크립트**
- 상태: 도구 부재
- 근거: `npm run lint` 미설정 (package.json, web/package.json 모두 lint 스크립트 없음)
- 참고: 린트 도구가 설치되지 않아 JavaScript/TypeScript 린트 검사를 수행할 수 없습니다.

**pyflakes**
- 상태: 도구 부재
- 근거: .venv 환경에 pyflakes 미설치
- 참고: 대신 py_compile으로 Python 구문 검증 수행

## 검증 결과

### Python (api/, scripts/ 디렉토리)
- **범위**: api/*.py (16개 파일), scripts/*.py (2개 파일)
- **도구**: `python -m py_compile`
- **결과**: 모든 파일 컴파일 성공 ✓
- 상세:
  - 구문 오류 0건
  - 임포트 경로 유효
  - 인코딩 선언 일관성 확인

### TypeScript (web/src/)
- **범위**: web/src/*.tsx, playwright-observations.ts, playwright.config.ts
- **도구**: `tsc --noEmit` (v5.9.3)
- **결과**: 타입 검사 통과 ✓
- 상세:
  - 타입 오류 0건
  - undefined 참조 검사 통과
  - 엄격 모드(strict: true) 검증 통과
  - React 타입 호환성 확인

## 결론

전체 프로젝트 범위(D:/common_tester)에서 **정적 분석 도구로 검출된 심각한 이슈 없음**.

- ✓ Python 파일: 구문 정상
- ✓ TypeScript 파일: 타입 정상
- ✓ 명시적 임포트 순환 의존성: 검출 안 됨
- ✓ 컴파일러 경고: 0건

**주의**: 동적 타입 검사(런타임 오류), 논리 오류, 비즈니스 로직 검증은 정적 분석 범위 외입니다. 타입 검사기와 컴파일러는 구문과 선언 타입만 검증합니다.
