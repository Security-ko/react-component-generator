import { useId, useState } from 'react';
import { isPromptLengthValid } from '../utils/promptValidation';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  promptHistory?: string[];
}

const EXAMPLES = [
  'SaaS 관리자용 KPI 카드 3개. 매출, 활성 사용자, 전환율을 비교 가능한 형태로 표시',
  '설정 페이지의 알림 토글 패널. 이메일, 슬랙, 주간 리포트 옵션 포함',
  '검색 필터 바. 상태, 담당자, 날짜 범위를 선택하고 결과 수를 보여주는 UI',
  '온보딩 체크리스트. 5단계 진행률과 완료/대기 상태를 보여주는 카드',
  '요금제 비교 카드 3개. 추천 플랜을 강조하고 CTA 버튼 포함',
  '테이블 행 상세보기 패널. 선택한 고객의 기본 정보와 최근 활동 표시',
];

export function PromptInput({ onGenerate, isLoading, promptHistory = [] }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const errorId = useId();
  const isLengthValid = isPromptLengthValid(prompt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && isLengthValid && !isLoading) {
      onGenerate(prompt.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="prompt-section">
      <div className="prompt-heading">
        
        <h2>무엇을 만들어볼까요?</h2><p>모양, 색감, 필요한 기능까지. 구체적일수록 좋아요.</p>
      </div>
      <form onSubmit={handleSubmit} className="prompt-form">
        <textarea
          aria-label="만들고 싶은 컴포넌트 설명"
          aria-invalid={!isLengthValid}
          aria-describedby={!isLengthValid ? errorId : undefined}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="예: 고객 목록 테이블 위에 들어갈 검색 필터 바를 만들어줘. 상태, 담당자, 날짜 범위 필터가 필요해."
          className="prompt-textarea"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e);
            }
          }}
        />
        {!isLengthValid && (
          <p id={errorId} className="prompt-error" role="alert">500자 이내로 입력해주세요.</p>
        )}
        <button
          type="submit"
          className="btn-generate"
          disabled={!prompt.trim() || !isLengthValid || isLoading}
        >
          {isLoading ? (
            <span className="loading-spinner">생성 중...</span>
          ) : (
            '컴포넌트 생성'
          )}
        </button>
        <span className="shortcut-hint">Ctrl / ⌘ + Enter로 생성</span>
      </form>
      {promptHistory.length > 0 && (
        <div className="prompt-examples" aria-label="프롬프트 히스토리">
          <span className="examples-label">최근 프롬프트</span>
          {promptHistory.map((item, index) => (
            <button key={`${index}-${item}`} type="button" className="example-chip" onClick={() => setPrompt(item)}>{item}</button>
          ))}
        </div>
      )}
      <div className="prompt-examples">
        <span className="examples-label">이런 것부터 시작해보세요</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            className="example-chip"
            onClick={() => handleExampleClick(example)}
            type="button"
          >
            <span className="example-icon" aria-hidden="true">{["▦", "☷", "⌕", "☑", "▤", "▥"][EXAMPLES.indexOf(example)]}</span><span>{["한눈에 보는 KPI 카드", "알림 설정 패널", "검색 필터 바", "온보딩 체크리스트", "요금제 비교 카드", "고객 상세 패널"][EXAMPLES.indexOf(example)]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
