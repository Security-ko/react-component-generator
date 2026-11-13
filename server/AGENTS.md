# Server Agent Instructions

## Module Context

Bun HTTP 서버가 제공자별 API를 호출하고 응답을 미리보기용 코드로 정규화한다. 순수 함수 모듈은 서버 기동 없이 테스트할 수 있게 분리되어 있다.

## Tech Stack & Constraints

Bun.serve, 네이티브 fetch, TypeScript, Vitest. 현재 제공자 호출은 SDK가 아닌 HTTP 요청이다. 테스트는 Bun 내장 테스트가 아니라 공통 Vitest 설정에서 실행된다.

## Implementation Patterns

- 응답 정규화는 `generator.ts`, 순차 시도는 `fallback.ts` 같은 부수효과 없는 함수로 분리한다. 테스트에서 이 함수들을 직접 import한다.
- 요청 처리 변경 시 성공 `{ code }`, 실패 `{ error }`, 설정 `{ envKeys }` 응답 형태를 클라이언트 소비 코드와 함께 확인한다.

## Testing Strategy

- 루트에서 `bun run test -- server/generator.test.ts server/fallback.test.ts`를 실행한다.
- 정규화 변경은 펜스 유무, 기존 render 보존, const/function 선언, 컴포넌트 미발견을 검증한다. 근거: [generator.test.ts:4](generator.test.ts#L4), [generator.test.ts:20](generator.test.ts#L20).
- 폴백 변경은 호출 순서·첫 성공 중단·마지막 오류·빈 목록을 검증한다. 근거: [fallback.test.ts:4](fallback.test.ts#L4).
- 현재 테스트는 `index.ts`를 import하지 않는다. 라우트·외부 응답 파싱을 바꾸면 fetch를 대체한 검증이나 로컬 라우트 검증을 별도로 수행하고, 외부 유료 API 호출을 단위 테스트에 넣지 않는다. 근거: [generator.test.ts:2](generator.test.ts#L2), [fallback.test.ts:2](fallback.test.ts#L2), [index.ts:138](index.ts#L138).

## Local Golden Rules

- **제공자 비대칭:** Google에만 모델 목록 순차 폴백과 `MAX_TOKENS` 감지가 있다. 공통화하면서 제거하거나 Anthropic에 같은 응답 구조가 있다고 가정하지 않는다. 현재 동작의 근거이지 과거 장애 이력을 뜻하지 않는다. 근거: [index.ts:5](index.ts#L5), [index.ts:88](index.ts#L88), [index.ts:122](index.ts#L122), [index.ts:134](index.ts#L134).
- **폴백 의미:** 모델을 병렬 호출하지 않는다. 순서대로 시도해 첫 성공을 반환하고, 전부 실패하면 마지막 오류를 던지는 의미를 유지한다. 근거: [fallback.ts:7](fallback.ts#L7), [fallback.ts:12](fallback.ts#L12), [fallback.test.ts:27](fallback.test.ts#L27).
- **이중 방어:** 프롬프트의 출력 형식 지시만 믿지 말고 `stripCodeFences` 다음 `ensureRenderCall` 순서를 유지한다. 이 함수들은 정규화이지 코드 보안 검증기가 아니다. 근거: [index.ts:16](index.ts#L16), [index.ts:188](index.ts#L188), [generator.ts:5](generator.ts#L5), [generator.ts:16](generator.ts#L16).
- **키 우선순위:** 직접 입력한 키가 서버 키보다 우선하며 둘 다 없으면 400을 반환한다. 키와 키가 들어간 Google 요청 URL을 로그·오류 응답에 노출하지 않는다. 근거: [index.ts:64](index.ts#L64), [index.ts:99](index.ts#L99), [index.ts:169](index.ts#L169).
- **HTTP 동작:** OPTIONS와 JSON 응답에 필요한 CORS 헤더를 보존한다. 외부 503·429 오류를 각각 503·429 사용자 안내로 변환하는 처리를 일반 500으로 합치지 않는다. 근거: [index.ts:51](index.ts#L51), [index.ts:141](index.ts#L141), [index.ts:194](index.ts#L194), [index.ts:201](index.ts#L201).
