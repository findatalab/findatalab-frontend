'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

const CHAT_ENDPOINT = process.env.NEXT_PUBLIC_CHAT_ENDPOINT || 'http://localhost:5000/chat';

function MarkdownMessage({ text }) {
  const safeHtml = useMemo(() => {
    const rawHtml = marked.parse(text, { breaks: true, gfm: true });
    return DOMPurify.sanitize(rawHtml);
  }, [text]);

  return <div className="message-body" dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}

export default function FinGptPage() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const messageText = userInput.trim();
    if (!messageText || isSending) {
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', sender: 'Вы: ', text: messageText }]);
    setUserInput('');
    setIsSending(true);

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'llm', sender: 'FinGPT: ', text: data.reply || '' }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'llm',
          sender: 'FinGPT: ',
          text: 'Не удалось получить ответ от сервера. Проверьте, что endpoint доступен по адресу http://localhost/chat.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="chat-page">
      <main className="app-shell">
        <section className="chat-container" aria-label="Chat">
          <header className="chat-header">
            <div className="chat-logo-safe">
              <img className="chat-logo" src="/logo.png" alt="FinDataLab logo" />
            </div>
            <div className="chat-title-group">
              <p className="chat-eyebrow">FinGPT</p>
              <h1>Ассистент для поступающих в Финансовый университет</h1>
              <Link className="chat-home-link" href="/">
                О лаборатории
              </Link>
            </div>
          </header>

          <div id="chat-box" className="chat-box" aria-live="polite">
            {messages.map((entry, index) => (
              <div key={`${entry.role}-${index}`} className={`message ${entry.role}`}>
                <span className="sender">{entry.sender}</span>
                {entry.role === 'llm' ? (
                  <MarkdownMessage text={entry.text} />
                ) : (
                  <div className="message-body">{entry.text}</div>
                )}
              </div>
            ))}
          </div>

          <form id="chat-form" autoComplete="off" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="user-input">
              Type your message
            </label>
            <input
              type="text"
              id="user-input"
              placeholder="Type your message..."
              value={userInput}
              onChange={(event) => setUserInput(event.target.value)}
              required
            />
            <button type="submit" disabled={isSending}>
              {isSending ? '...' : 'Send'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}