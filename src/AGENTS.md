# Frontend Agent Instructions

## Module Context

브라우저 입력과 생성 결과 상태를 관리하며, 서버가 반환한 코드 문자열을 react-live로 실행하거나 복사한다.

## Tech Stack & Constraints

React 19, TypeScript, react-live 4, Vitest, Testing Library. JSX 앱 소스와 모델이 생성하는 JSX 문자열은 별도 계약이다. 전역 디자인 토큰은 `App.css`, 기본 리셋과 포커스는 `index.css`에서 관리한다.

## Implementation Patterns

- API 요청과 결과 목록 갱신은 `useComponentGenerator`에, 제공자·키 선택은 `App`에 둔다. 표현 컴포넌트는 콜백으로 작업을 위임하는 기존 경계를 따른다.
- 새 결과는 목록 앞에 추가한다. `GeneratedComponent.createdAt`은 `Date`이므로 직렬화나 영속화를 도입하면 복원 처리를 함께 설계한다. 근거: [hooks/useComponentGenerator.ts:35](hooks/useComponentGenerator.ts#L35), [components/ComponentCard.tsx:18](components/ComponentCard.tsx#L18).

## Testing Strategy

- 루트에서 `bun run test -- src/components/PromptInput.test.tsx`로 입력 회귀 테스트를 실행한다.
- 현재 테스트는 빈 입력 비활성화, 제출 콜백, 로딩 비활성화를 확인한다. `App`·훅·미리보기 통합까지 검증했다고 보고하지 않는다.
- UI 동작 변경은 `getByRole`·`userEvent` 중심으로 검증한다. 공통 정리는 [test/setup.ts:6](test/setup.ts#L6)에 있으므로 테스트별 중복 정리를 추가하지 않는다.
- 레이아웃 변경은 데스크톱·모바일과 키보드 포커스를 확인한다. 자동 테스트가 CSS를 검증하지 않는 점을 고려한다. 근거: [../vite.config.ts:20](../vite.config.ts#L20), [index.css:6](index.css#L6).

## Local Golden Rules

- **이중 방어:** 생성 버튼의 disabled뿐 아니라 submit 핸들러의 공백·로딩 검사도 유지한다. Ctrl/Command+Enter는 핸들러를 직접 호출한다. 근거: [components/PromptInput.tsx:20](components/PromptInput.tsx#L20), [components/PromptInput.tsx:45](components/PromptInput.tsx#L45), [components/PromptInput.tsx:54](components/PromptInput.tsx#L54).
- **키 상태:** 제공자를 바꿀 때 직접 입력한 키를 초기화한다. 키 입력을 다른 제공자에 그대로 재사용하지 않는다. 근거: [App.tsx:41](App.tsx#L41).
- **요청 계약:** 서버 키 사용 시 `apiKey`를 생략하고, 선택한 `provider`는 명시적으로 전송한다. HTTP 실패를 결과 카드에 추가하지 않고 오류 상태로 전달하며 finally에서 로딩을 종료한다. 근거: [hooks/useComponentGenerator.ts:23](hooks/useComponentGenerator.ts#L23), [hooks/useComponentGenerator.ts:31](hooks/useComponentGenerator.ts#L31), [hooks/useComponentGenerator.ts:43](hooks/useComponentGenerator.ts#L43).
- **미리보기 동작:** 새로고침은 모델 재호출이 아니라 key 변경을 통한 리마운트다. 재생성은 원래 프롬프트로 요청하는 별도 동작으로 유지한다. 근거: [components/ComponentCard.tsx:33](components/ComponentCard.tsx#L33), [components/ComponentCard.tsx:41](components/ComponentCard.tsx#L41), [components/ComponentCard.tsx:70](components/ComponentCard.tsx#L70).
- **실행 경계:** 현재 미리보기는 iframe 샌드박스가 아니라 앱 안의 LiveProvider다. 정규화가 임의 코드의 안전성을 보장한다고 설명하지 말고, 생성 코드에 키나 추가 권한을 scope로 전달하지 않는다. 근거: [components/LivePreview.tsx:14](components/LivePreview.tsx#L14), [../server/generator.ts:5](../server/generator.ts#L5).
