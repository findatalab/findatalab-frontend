'use client';

import Link from 'next/link';
import { useState } from 'react';

const API_ENDPOINT = '/api/llmcity/chat';

const SENTIMENT_META = {
  positive: { label: 'Позитивная', color: '#1a7f5a', bg: '#d6f5e8', border: '#a3e4c8' },
  negative: { label: 'Негативная', color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' },
  neutral:  { label: 'Нейтральная', color: '#374151', bg: '#f3f4f6', border: '#d1d5db' },
  mixed:    { label: 'Смешанная',   color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
};

function SentimentBadge({ label, score }) {
  const meta = SENTIMENT_META[label] || SENTIMENT_META.neutral;
  const pct = Math.round(Math.abs(score ?? 0) * 100);

  return (
    <div
      className="lc-sentiment-badge"
      style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
    >
      <span className="lc-sentiment-label">{meta.label}</span>
      {score !== undefined && (
        <span className="lc-sentiment-score">{pct}%</span>
      )}
    </div>
  );
}

function ScoreBar({ score }) {
  const clamped = Math.max(-1, Math.min(1, score ?? 0));
  const pct = ((clamped + 1) / 2) * 100;
  const color =
    clamped > 0.1 ? 'var(--brand-primary)' : clamped < -0.1 ? '#dc2626' : '#9ca3af';

  return (
    <div className="lc-score-bar-wrap" aria-hidden="true">
      <span className="lc-score-bar-end">−</span>
      <div className="lc-score-bar-track">
        <div
          className="lc-score-bar-fill"
          style={{ left: `${Math.min(pct, 50)}%`, right: `${Math.max(100 - pct, 50)}%`, background: color }}
        />
        <div className="lc-score-bar-thumb" style={{ left: `${pct}%`, background: color }} />
      </div>
      <span className="lc-score-bar-end">+</span>
    </div>
  );
}

function CommentCard({ text, index }) {
  return (
    <div className="lc-comment-card">
      <div className="lc-comment-avatar" aria-hidden="true">
        {String.fromCodePoint(0x1f465)}
      </div>
      <div className="lc-comment-body">
        <span className="lc-comment-author">Пользователь_{index + 1}</span>
        <p className="lc-comment-text">{text}</p>
      </div>
    </div>
  );
}

export default function LlmCityPage() {
  const [newsText, setNewsText]       = useState('');
  const [commentCount, setCommentCount] = useState(5);
  const [isLoading, setIsLoading]     = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const news = newsText.trim();
    if (!news || isLoading) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news, commentCount }),
      });

      const contentType = response.headers.get('content-type') || '';
      let data = null;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const rawText = await response.text();
        data = {
          error: `Сервер вернул не JSON-ответ (${response.status}).`,
          details: rawText.slice(0, 200),
        };
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.details || `HTTP ${response.status}`);
      }

      setResult(data);
    } catch (err) {
      setError(err?.message || 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setNewsText('');
  };

  return (
    <div className="chat-page">
      <main className="app-shell">
        <section className="chat-container" aria-label="LLM City">
          <header className="chat-header">
            <div className="chat-logo-safe">
              <img className="chat-logo" src="/logo.png" alt="FinDataLab logo" />
            </div>
            <div className="chat-title-group">
              <p className="chat-eyebrow">LLM City</p>
              <h1>Анализ тональности и генерация комментариев</h1>
              <Link className="chat-home-link" href="/">
                О лаборатории
              </Link>
            </div>
          </header>

          <div className="lc-body">
            {!result ? (
              <form className="lc-form" onSubmit={handleSubmit} autoComplete="off">
                <div className="lc-field">
                  <label className="lc-label" htmlFor="lc-news">
                    Текст новости
                  </label>
                  <textarea
                    id="lc-news"
                    className="lc-textarea"
                    placeholder="Вставьте или введите текст новости…"
                    rows={6}
                    value={newsText}
                    onChange={(e) => setNewsText(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="lc-field lc-slider-field">
                  <label className="lc-label" htmlFor="lc-count">
                    Количество комментариев
                  </label>
                  <div className="lc-slider-row">
                    <input
                      id="lc-count"
                      type="range"
                      min={1}
                      max={20}
                      step={1}
                      value={commentCount}
                      onChange={(e) => setCommentCount(Number(e.target.value))}
                      disabled={isLoading}
                      className="lc-slider"
                    />
                    <span className="lc-slider-value">{commentCount}</span>
                  </div>
                </div>

                {error && (
                  <p className="lc-error" role="alert">
                    Не удалось получить ответ. Попробуйте ещё раз через несколько секунд.
                    {error && <span className="lc-error-detail"> ({error})</span>}
                  </p>
                )}

                <button className="lc-submit" type="submit" disabled={isLoading || !newsText.trim()}>
                  {isLoading ? (
                    <span className="lc-spinner" aria-label="Загрузка" />
                  ) : (
                    'Проанализировать'
                  )}
                </button>
              </form>
            ) : (
              <div className="lc-results" aria-live="polite">
                <section className="lc-sentiment-section">
                  <h2 className="lc-section-title">Тональность</h2>
                  <div className="lc-sentiment-card">
                    <SentimentBadge label={result.sentiment?.label} score={result.sentiment?.score} />
                    {result.sentiment?.score !== undefined && (
                      <ScoreBar score={result.sentiment.score} />
                    )}
                    {result.sentiment?.explanation && (
                      <p className="lc-sentiment-explanation">{result.sentiment.explanation}</p>
                    )}
                  </div>
                </section>

                <section className="lc-comments-section">
                  <h2 className="lc-section-title">
                    Комментарии
                    <span className="lc-comments-count">
                      {result.comments?.length ?? 0}
                    </span>
                  </h2>
                  <div className="lc-comments-list">
                    {(result.comments ?? []).map((text, i) => (
                      <CommentCard key={i} text={text} index={i} />
                    ))}
                  </div>
                </section>

                <button className="lc-reset" onClick={handleReset}>
                  Новая новость
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}