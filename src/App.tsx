import { useState, useEffect } from 'react';
import { PromptInput } from './components/PromptInput';
import { ComponentCard } from './components/ComponentCard';
import { useComponentGenerator } from './hooks/useComponentGenerator';
import type { Provider } from './types';
import './App.css';

const PROVIDER_CONFIG = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  google: { label: 'Google', placeholder: 'AIza...' },
} as const;

function App() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState<Provider>('google');
  const [envKeys, setEnvKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });
  const { components, isLoading, error, generate, removeComponent, clearAll } =
    useComponentGenerator();

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvKeys(data.envKeys))
      .catch(() => {});
  }, []);

  const hasEnvKey = envKeys[provider];

  const handleGenerate = (prompt: string) => {
    if (!apiKey.trim() && !hasEnvKey) {
      alert(`${PROVIDER_CONFIG[provider].label} API 키를 입력하거나 .env에 설정해주세요.`);
      return;
    }
    generate(prompt, apiKey || undefined, provider);
  };

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setApiKey('');
  };



  return (
    <div className="app">
      <header className="app-header">
        <a className="brand" href="#"><span className="brand-mark" aria-hidden="true">▧</span> Component Studio<span className="brand-version">for React</span></a>
        <div className="connection-status"><span className="status-dot" />{isLoading ? '컴포넌트 만드는 중' : '아이디어를 만들 준비 완료'}</div>
      </header>
      <section className="studio-intro">
        <div className="intro-copy"><p className="intro-note">작은 아이디어를, 작동하는 화면으로.</p><h1>Make something<br />worth clicking.</h1><p>원하는 UI를 말로 적어보세요.<br />미리 보고, 코드를 가져와 내 프로젝트에 더하세요.</p></div>
        <div className="intro-art" aria-hidden="true"><div className="art-back"><span>your next idea.jsx</span><b>✳</b></div><div className="art-front"><div className="art-title"><span /> A little possibility <i>×</i></div><div className="art-body"><span className="art-symbol">✳</span><strong>Hello, creator.</strong><div className="art-line" /><div className="art-line short" /><span className="art-button">Let’s make it</span></div></div><span className="art-sticker">Made to<br />be yours.</span></div>
      </section>

      <main className="workspace">
        <section className="composer-panel" aria-label="컴포넌트 생성"><div className="window-bar"><span className="window-dot" />새 컴포넌트<span className="window-controls" aria-hidden="true">− □ ×</span></div>
          <PromptInput onGenerate={handleGenerate} isLoading={isLoading} />
        </section>

        <aside className="settings-panel" aria-label="실행 설정">
          <div className="settings-header">
            <h2>연결 설정</h2><span aria-hidden="true">⚙</span>
          </div>
          <div className="provider-select">
            <label htmlFor="provider">AI 모델 제공자</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as Provider)}
            >
              {Object.entries(PROVIDER_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="api-key-input">
            <label htmlFor="api-key">
              API 키
            </label>
            <div className="api-key-field">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  hasEnvKey
                    ? '서버 키 사용 중 (직접 입력으로 덮어쓰기 가능)'
                    : PROVIDER_CONFIG[provider].placeholder
                }
              />
              <button
                className="btn-toggle-key"
                onClick={() => setShowKey(!showKey)}
                type="button"
              >
                {showKey ? '숨기기' : '보기'}
              </button>
            </div>
            <p className={`key-status ${hasEnvKey ? 'key-status--ready' : ''}`}>
              {hasEnvKey ? '서버 API 키가 연결되어 있어요.' : '사용할 모델의 API 키를 입력해주세요.'}
            </p>
          </div>
          <div className="settings-note"><span aria-hidden="true">⌘</span><p>아이디어는 자유롭게.<br />코드는 내 프로젝트에 맞게.</p></div>
        </aside>
      </main>

      {error && (
        <div className="error-banner" role="alert">
          <p>{error}</p>
        </div>
      )}

      <section className="results-section">
        <div className="results-header"><div className="results-title"><h2>나의 작업대</h2><span className="result-count">{components.length}</span></div>{components.length > 0 ? <button className="btn-clear" onClick={clearAll}>전체 삭제</button> : <span className="results-hint">아이디어가 화면이 되는 곳</span>}</div>

        {components.length === 0 && !isLoading && (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true"><span>＋</span><i /></div>
            <div className="empty-copy"><h2>첫 번째 아이디어를 기다리고 있어요.</h2><p>위에 설명을 적거나 예시를 골라 시작하세요.<br />생성한 컴포넌트는 이곳에서 바로 확인할 수 있어요.</p></div>
          </div>
        )}

        {isLoading && (
          <div className="loading-card">
            <div className="loading-pulse" />
            <p>컴포넌트를 생성하고 있습니다...</p>
          </div>
        )}

        <div className="results-grid">
          {components.map((component) => (
            <ComponentCard
              key={component.id}
              component={component}
              onRemove={removeComponent}
              onRegenerate={handleGenerate}
              isLoading={isLoading}
            />
          ))}
        </div>
      </section><footer className="app-footer"><span>Component Studio</span><span>생각하고, 만들고, 다시 다듬고.</span><span>Built for your next idea.</span></footer>
    </div>
  );
}

export default App;
