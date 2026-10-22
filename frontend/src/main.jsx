import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [text, setText] = useState('Hello from HackOHI/O!');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        throw new Error(response.status === 422
          ? '输入内容无效，请输入 1–2000 个字符。'
          : `后端请求失败（HTTP ${response.status}），请检查后端窗口。`);
      }
      setResult(await response.json());
    } catch (failure) {
      setError(failure.name === 'TimeoutError'
        ? '请求超时，请检查后端是否启动。'
        : failure.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main>
      <p className="eyebrow">HACKOHI/O 2026 · PRE-EVENT PRACTICE</p>
      <h1>前后端联调练习</h1>
      <p>输入文字，验证 React → FastAPI → JSON → 页面展示。这一步不调用 AI。</p>
      <form onSubmit={submit}>
        <label htmlFor="text">测试文字</label>
        <textarea id="text" value={text} maxLength={2000} required
          onChange={(event) => setText(event.target.value)} rows={4} />
        <button disabled={pending || !text.trim()} type="submit">
          {pending ? '请求中…' : '发送到后端'}
        </button>
      </form>
      <section aria-live="polite" aria-busy={pending}>
        {error ? <p role="alert" className="error">{error}</p> : null}
        {result ? <><h2>联调成功</h2><pre>{JSON.stringify(result, null, 2)}</pre></> : null}
      </section>
      <footer>赛前通用练习。若复用代码，请在参赛材料中披露。</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
