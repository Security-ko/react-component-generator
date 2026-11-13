# Agent Instructions

## Operational Commands

저장소 루트에서 실행한다. Bun 런타임과 `bun.lock`을 유지하고, 작업 중 다른 패키지 매니저의 lockfile을 추가하지 않는다.

- 개발 서버: `bun run dev` (실행 상세는 [README](README.md) 참고).
- API만 실행: `bun run server`.
- 프로덕션 빌드: `bun run build`.
- 전체 테스트: `bun run test`.
- 전체 테스트에는 Python 3 표준 라이브러리 기반 Codex 훅 테스트도 포함된다. `python` 명령을 사용할 수 있어야 한다. 에이전트는 비밀 파일 자동 로드를 피하도록 `bun --no-env-file run test`를 사용한다(Vite의 test 모드도 환경 파일 로드를 비활성화한다).
- 린트: `bun run lint`.
- 변경에 해당하는 검증을 실행하고 결과와 미검증 범위를 보고한다. `bun test`는 이 프로젝트의 Vitest 설정을 사용하는 명령이 아니므로 대체하지 않는다.
- Windows에서 Bun을 찾지 못하면 `$env:USERPROFILE\.bun\bin\bun.exe`의 존재를 확인한다. 설치되어 있으면 현재 세션 PATH에 해당 디렉터리를 추가한다.

## Sensitive File Access — 민감 파일 차단

- 에이전트와 서브 에이전트는 민감 파일을 읽거나 생성·수정·삭제·이동·복사하지 않는다. 파일명 대소문자와 관계없이 모든 경로의 `.env*`, `*.env`, `secret*`, `.secret*`, `credential*`, `.credential*`, 오타 `credentail*`, 서비스 계정 JSON, 개인 키·인증서 저장소(`*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `id_rsa*`, `id_ed25519*`), `.ssh`, `.aws`, `.azure`, `.npmrc`, `.pypirc`, `.netrc`를 대상으로 한다. 해당 이름의 디렉터리 내부도 차단하며 `.env.example` 등 예제 파일도 예외로 열지 않는다.
- 검색·diff·아카이브·Git 이력 조회에서도 민감 파일을 제외한다. 전체 파일 덤프, 환경변수 전체 출력, 로그·브라우저 저장소·다른 도구·심볼릭 링크·하드 링크를 통한 우회 접근을 하지 않는다. 민감 값은 응답·로그·커밋·PR·테스트 픽스처에 포함하지 않는다.
- 설정이 필요하면 변수 이름과 비밀값 없는 안내만 제공하고 실제 파일 편집은 사용자에게 맡긴다. 민감 파일 없이 가능한 작업을 계속하며, 접근 차단을 이유로 권한 확대나 Full access 전환을 요청하지 않는다. 검증에는 실제 비밀 대신 합성 값과 독립된 임시 자료를 사용한다.
- 프로젝트 프로필은 [`.codex/config.toml`](.codex/config.toml)의 `project-secrets-blocked`이다. 새 sandbox 세션에서 이 프로필이 활성화되었는지 확인한다. Full access 또는 다른 프로필은 이 차단을 보장하지 않는다. AGENTS.md는 행동 규칙이며 OS 수준 강제 차단을 대체하지 않는다.
- Windows/Linux의 glob 차단은 프로세스 시작 시 기존 경로를 최대 16단계까지 확인한다. 실행 중 새로 생성된 파일이나 더 깊은 경로까지 절대 차단한다고 가정하지 않는다. 장기 실행 프로세스로 차단을 우회하지 않으며, 민감 자료는 고정된 차단 디렉터리(`secrets/` 등)에 보관하도록 안내한다. 앱이 `.env`를 읽어야 하는 개발 서버는 사용자가 별도로 실행한다.

## Golden Rules

- **커밋 Protection Hook:** [`.codex/config.toml`](.codex/config.toml)의 Codex `PreToolUse` 훅이 `Bash`(unified exec 포함) 커밋 명령 직전에 전체 테스트를 실행한다. 하나라도 실패하거나 Bun 실행 오류·240초 시간 초과가 발생하면 명시적 `deny`로 해당 도구 실행을 차단한다. 실패를 수정한 뒤 다시 검사하며 과거 성공 결과를 재사용하지 않는다.
- 커밋은 프로젝트 루트에서 `git commit ...` 단독 명령으로 실행한다. 파일 수정·스테이징·디렉터리 변경을 커밋 명령과 결합하지 않는다. 다른 저장소를 가리키는 옵션, 별칭·래퍼·인코딩된 명령·대화형 셸·`write_stdin`·다른 도구로 훅을 우회하지 않는다. 검증한 작업 트리와 커밋할 스테이징 내용이 일치하는지 확인한다.
- 훅 활성화·신뢰 승인이 확인되지 않았거나 훅 자체가 로드되지 않으면 커밋하지 않고 원인을 보고한다. 프로젝트 훅은 관리자 강제 정책이 아니며 Codex의 훅 오류·외부 타임아웃·우회 실행 경로까지 절대 차단하지 못한다. 테스트 실패 시 커밋 동작은 중단하지만 수정·검증 작업은 계속할 수 있다. Git 훅은 사용하지 않는다.

- **보안 경계:** 서버 환경변수의 API 키는 서버에만 둔다. `/api/config`는 키 존재 여부만 반환해야 하며 키 원문을 클라이언트 번들·응답에 넣지 않는다. 근거: [server/index.ts:59](server/index.ts#L59), [server/index.ts:147](server/index.ts#L147).
- **런타임 계약:** 생성 결과는 import와 TypeScript 문법이 없는 자체 완결 JSX이며 `render(...)` 호출을 포함한다. 앱 소스의 TypeScript 규칙과 생성 문자열의 규칙을 혼동하지 않는다. 계약 변경 시 생성 지침·정규화·미리보기를 함께 확인한다. 근거: [server/index.ts:10](server/index.ts#L10), [server/index.ts:20](server/index.ts#L20), [server/index.ts:188](server/index.ts#L188), [src/components/LivePreview.tsx:14](src/components/LivePreview.tsx#L14).
- **API 결합:** 제공자를 추가·변경하면 클라이언트 타입, 선택 UI, 서버 타입·키 매핑·분기를 함께 검토한다. UI 기본값은 Google, 제공자 생략 시 서버 기본값은 Anthropic이다. 이 차이를 우연히 바꾸지 않는다. 근거: [src/types/index.ts:1](src/types/index.ts#L1), [src/App.tsx:8](src/App.tsx#L8), [src/App.tsx:16](src/App.tsx#L16), [server/index.ts:57](server/index.ts#L57), [server/index.ts:161](server/index.ts#L161), [server/index.ts:183](server/index.ts#L183).
- **개발 연결:** API 포트 변경 시 Vite의 `/api` 프록시 대상도 맞춘다. 클라이언트의 상대 API 경로를 외부 모델 URL로 바꾸지 않는다. 근거: [server/index.ts:139](server/index.ts#L139), [vite.config.ts:10](vite.config.ts#L10), [src/hooks/useComponentGenerator.ts:23](src/hooks/useComponentGenerator.ts#L23).
- **검증 경계:** 빌드는 `src`와 Vite 설정을 타입 검사하지만 `server`는 포함하지 않는다. 빌드 통과를 서버 타입·라우트 검증으로 보고하지 않는다. 현재 서버 테스트도 정규화와 폴백에 한정된다. 근거: [tsconfig.app.json:27](tsconfig.app.json#L27), [tsconfig.node.json:25](tsconfig.node.json#L25), [server/generator.test.ts:1](server/generator.test.ts#L1), [server/fallback.test.ts:1](server/fallback.test.ts#L1).

## TDD Rule

**이 규칙은 Rigid — 상황에 맞게 변형하지 마라.**

Codex `PreToolUse`의 [Reminder Hook](.codex/hooks/remind_tdd.py)은 `.ts`·`.tsx` 파일 생성·수정에 해당하는 `apply_patch`·구조화된 Edit/Write와 인식 가능한 Bash 쓰기 명령 직전에 이 섹션을 `additionalContext`로 전달한다. 에이전트는 대상 경로의 하위 규칙과 RED 확인 여부를 점검한다. 이 훅은 리마인더이며 TDD 준수를 자동 판정하거나 실행을 차단하지 않는다. 경로가 숨겨진 스크립트·별칭·대화형 입력 등은 감지하지 못할 수 있으므로 파일 편집은 `apply_patch`를 우선한다.

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

## 구현 완료 후 Evaluator 리뷰

- 메인 에이전트는 구현 코드 또는 동작 설정 작성과 관련 검증을 마친 뒤, 최종 완료 보고·커밋·PR 생성 전에 프로젝트의 [`evaluator`](.codex/agents/evaluator.toml) 서브 에이전트를 반드시 호출하고 결과를 기다린다. 구현 중 매 편집마다 호출하지 않는다.
- 역할 선택을 지원하는 도구에서는 `evaluator` 역할로 생성한다. 현재 도구에 역할 선택 필드가 없거나 새 역할이 아직 노출되지 않으면, 해당 TOML의 지침을 읽어 `spawn_agent`에 전달하고 `model="gpt-6.1-sol"`, `fork_turns="none"`으로 독립 평가를 실행한다. 메인 모델을 그대로 상속하거나 다른 모델로 묵시적으로 대체하지 않는다.
- evaluator는 읽기 전용 조회·검색 도구만 사용한다. 역할 설정에서 셸·앱·플러그인·메모리·권한 확대 도구를 비활성화하며, 테스트 실행과 임시 재현 파일 작성은 메인 에이전트에 맡긴다. 역할 선택 없는 fallback 호출은 이 기능 제한을 자동 적용하지 못하므로, 동일한 도구 제한을 적용할 수 없다면 사용하지 않고 평가 미완료를 보고한다. 이 설정은 역할별 쓰기 도구 허용목록이나 독립 read-only 샌드박스를 제공하지 않으므로 이를 OS 수준 강제 차단으로 설명하지 않는다.
- 사용자 요구사항·완료 기준, 저장소 절대 경로, 이번 변경 파일·비교 기준, 실행한 검증과 알려진 제약을 전달한다. 구현자의 결론으로 평가를 유도하지 않는다. 평가 중 동일 파일을 수정하지 않는다.
- evaluator는 '구현이 틀렸다'는 가정에서 반례를 찾되, 증거 없는 결함을 만들지 않고 코드 수정 없이 결과를 반환한다. 이 완료 후 호출 규칙은 메인 에이전트에만 적용하며 evaluator 자신이나 다른 평가용 서브 에이전트가 재귀 호출하지 않는다.
- 메인 에이전트는 지적을 독립 검증하고 유효한 결함을 수정·검증한 뒤 수정 범위를 evaluator에 재검토시킨다. 반영하지 않은 지적은 근거를 기록한다. 호출 실패·모델 미가용·예산 제한 등으로 평가를 마치지 못하면 리뷰 미완료와 차단 원인을 보고하고 완료 또는 리뷰 통과로 표현하지 않는다. 같은 실패를 해결 없이 반복 호출하지 않는다.
- 이는 AGENTS.md에 따른 메인 에이전트의 필수 호출 절차다. TOML 등록 자체가 완료 이벤트를 감지하거나 서브 에이전트를 자동 실행하는 훅은 아니다.

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
