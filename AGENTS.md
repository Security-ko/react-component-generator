# Agent Instructions

## Operational Commands

저장소 루트에서 실행한다. Bun 런타임과 `bun.lock`을 유지하고, 작업 중 다른 패키지 매니저의 lockfile을 추가하지 않는다.

- 개발 서버: `bun run dev` (실행 상세는 [README](README.md) 참고).
- API만 실행: `bun run server`.
- 프로덕션 빌드: `bun run build`.
- 전체 테스트: `bun run test`.
- 린트: `bun run lint`.
- 변경에 해당하는 검증을 실행하고 결과와 미검증 범위를 보고한다. `bun test`는 이 프로젝트의 Vitest 설정을 사용하는 명령이 아니므로 대체하지 않는다.
- Windows에서 Bun을 찾지 못하면 `$env:USERPROFILE\.bun\bin\bun.exe`의 존재를 확인한다. 설치되어 있으면 현재 세션 PATH에 해당 디렉터리를 추가한다.

## Golden Rules

- **보안 경계:** 서버 환경변수의 API 키는 서버에만 둔다. `/api/config`는 키 존재 여부만 반환해야 하며 키 원문을 클라이언트 번들·응답에 넣지 않는다. 근거: [server/index.ts:59](server/index.ts#L59), [server/index.ts:147](server/index.ts#L147).
- **런타임 계약:** 생성 결과는 import와 TypeScript 문법이 없는 자체 완결 JSX이며 `render(...)` 호출을 포함한다. 앱 소스의 TypeScript 규칙과 생성 문자열의 규칙을 혼동하지 않는다. 계약 변경 시 생성 지침·정규화·미리보기를 함께 확인한다. 근거: [server/index.ts:10](server/index.ts#L10), [server/index.ts:20](server/index.ts#L20), [server/index.ts:188](server/index.ts#L188), [src/components/LivePreview.tsx:14](src/components/LivePreview.tsx#L14).
- **API 결합:** 제공자를 추가·변경하면 클라이언트 타입, 선택 UI, 서버 타입·키 매핑·분기를 함께 검토한다. UI 기본값은 Google, 제공자 생략 시 서버 기본값은 Anthropic이다. 이 차이를 우연히 바꾸지 않는다. 근거: [src/types/index.ts:1](src/types/index.ts#L1), [src/App.tsx:8](src/App.tsx#L8), [src/App.tsx:16](src/App.tsx#L16), [server/index.ts:57](server/index.ts#L57), [server/index.ts:161](server/index.ts#L161), [server/index.ts:183](server/index.ts#L183).
- **개발 연결:** API 포트 변경 시 Vite의 `/api` 프록시 대상도 맞춘다. 클라이언트의 상대 API 경로를 외부 모델 URL로 바꾸지 않는다. 근거: [server/index.ts:139](server/index.ts#L139), [vite.config.ts:10](vite.config.ts#L10), [src/hooks/useComponentGenerator.ts:23](src/hooks/useComponentGenerator.ts#L23).
- **검증 경계:** 빌드는 `src`와 Vite 설정을 타입 검사하지만 `server`는 포함하지 않는다. 빌드 통과를 서버 타입·라우트 검증으로 보고하지 않는다. 현재 서버 테스트도 정규화와 폴백에 한정된다. 근거: [tsconfig.app.json:27](tsconfig.app.json#L27), [tsconfig.node.json:25](tsconfig.node.json#L25), [server/generator.test.ts:1](server/generator.test.ts#L1), [server/fallback.test.ts:1](server/fallback.test.ts#L1).

## TDD Rule

**이 규칙은 Rigid — 상황에 맞게 변형하지 마라.**

### 적용 기준

- **필수:** 비즈니스 로직, API, 유틸리티, 동작 오류의 버그 수정.
- **불필요:** 타입 정의, 설정 파일, 순수 UI(레이아웃·스타일·문구), SQL.
- 파일 확장자가 아니라 **변경하는 동작**으로 판단한다. UI에 포함된 비즈니스 로직과 API 연동은 필수 대상이다.

### RED-GREEN-REFACTOR

1. **RED:** 다음에 구현할 **하나의 동작에 하나의 테스트**를 작성한다. 버그 수정은 재현 테스트부터 작성한다. **반드시 실행해 실패를 확인**한다. 실패 이유는 **기능 미구현 또는 수정할 동작의 결함**이어야 한다. 문법·import·환경 오류는 먼저 해결하고 의도한 실패를 다시 확인한다. 처음부터 통과하면 요구 동작을 검증하는지 점검한다.
2. **GREEN:** 해당 테스트를 통과시키는 **최소한의 코드만** 작성한다. **YAGNI**에 따라 예상 기능과 불필요한 추상화를 추가하지 않는다. **신규 테스트와 기존 테스트가 모두 통과**하는지 실행해 확인한다.
3. **REFACTOR:** 중복 제거, 이름 개선, 헬퍼 추출로 구조를 다듬는다. 테스트를 실행하며 **green을 유지**한다. **새 동작을 추가하지 않는다.**
4. **반복:** 다음 동작의 **RED**로 돌아간다. 여러 동작을 먼저 구현한 뒤 테스트를 몰아 작성하지 않는다.

### 삭제 강제 규칙

- 필수 대상에서 **테스트 전에 작성한 해당 작업의 프로덕션 코드는 삭제하고 RED부터 재시작**한다.
- **참고용으로 남기는 것도 금지**한다. 주석·별도 파일·복사본으로 보관해 테스트를 사후에 맞추지 않는다.
- 삭제 대상은 이번 작업에서 테스트보다 먼저 작성한 구현이다. 기존 코드나 다른 사람의 변경을 삭제하지 않는다.

### 변명 차단표

| 변명 | 반론 |
| --- | --- |
| 너무 단순해서 테스트 불필요 | 단순함은 면제 기준이 아니다. 필수 대상이면 한 동작의 실패부터 확인한다. |
| 나중에 추가하겠다 | 사후 테스트는 구현 전 실패를 증명하지 못한다. RED부터 시작한다. |
| 시간이 없다 | 필수 동작을 작게 나누고 사이클을 짧게 반복한다. 순서를 생략하지 않는다. |
| 삭제하면 낭비 | 테스트보다 먼저 작성한 구현을 유지하지 않는다. 삭제하고 검증 가능한 순서로 다시 만든다. |
| 프로토타입이다 | 프로토타입도 필수 대상이면 동일하게 적용한다. 작업 이름으로 면제하지 않는다. |

### 하위 규칙 우선

이 섹션은 **전역 기본값(fallback)**이다. 작업 경로의 **하위 디렉터리 AGENTS.md에 별도 TDD 규칙이 있으면 해당 규칙을 우선** 적용한다. 별도 규칙이 없으면 이 섹션을 따른다.

## Project Context

제품 목적과 기술 스택은 [README](README.md)를 기준으로 한다. 에이전트는 생성 코드의 실행 계약과 키 경계를 유지하면서 변경한다.

## Standards & References

- 타입 전용 import는 `import type`을 사용한다. TypeScript의 strict·미사용 검사와 ESLint의 Hooks 규칙을 유지한다. 근거: [tsconfig.app.json](tsconfig.app.json), [eslint.config.js](eslint.config.js).
- 커밋 요청 시 [commit 스킬](.agents/skills/commit/SKILL.md)을 적용한다. 논리적 단위로 나누고 `feat/fix/refactor/chore: 한국어 요약` 형식을 사용하며 추가 승인 없이 커밋한다. 사용자가 사전 확인을 명시하면 그 지시를 따른다.
- 별도 요청 없이 push 또는 이력 재작성을 하지 않는다.
- 규칙과 코드가 달라지면 근거를 다시 확인하고 문서 업데이트를 제안한다. 모든 AGENTS.md는 500줄 미만으로 유지한다.

## Context Map

- **[UI·입력·미리보기 수정](src/AGENTS.md)** — 브라우저 상태, 생성 결과 표시, 프론트엔드 테스트.
- **[API·모델 호출·응답 정규화 수정](server/AGENTS.md)** — Bun 서버, 제공자별 처리, 폴백과 순수 함수 테스트.
