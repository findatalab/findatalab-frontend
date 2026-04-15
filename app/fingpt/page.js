'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

const CHAT_ENDPOINT = 'api/chat/';
const CHAT_MODEL = process.env.NEXT_PUBLIC_CHAT_MODEL || 'finenroll';
const CHAT_HISTORY_ID_ENV = process.env.NEXT_PUBLIC_CHAT_HISTORY_ID;
const CHAT_HISTORY_STORAGE_KEY = 'fingpt_chat_history_id';

function createChatHistoryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `fingpt_chat_history_${crypto.randomUUID()}`;
  }

  return `fingpt_chat_history_${Date.now()}`;
}

function getOrCreateChatHistoryId() {
  if (CHAT_HISTORY_ID_ENV) {
    return CHAT_HISTORY_ID_ENV;
  }

  if (typeof window === 'undefined') {
    return 'fingpt_chat_history';
  }

  const existingId = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
  if (existingId) {
    return existingId;
  }

  const newId = createChatHistoryId();
  window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, newId);

  return newId;
}

function extractAssistantText(data) {
  if (!data || typeof data !== 'object') {
    return '';
  }

  if (typeof data.reply === 'string') {
    return data.reply;
  }

  if (typeof data.content === 'string') {
    return data.content;
  }

  const firstChoice = data.choices?.[0];
  if (!firstChoice) {
    return '';
  }

  if (typeof firstChoice.text === 'string') {
    return firstChoice.text;
  }

  if (typeof firstChoice.message?.content === 'string') {
    return firstChoice.message.content;
  }

  if (Array.isArray(firstChoice.message?.content)) {
    return firstChoice.message.content
      .map((item) => (typeof item?.text === 'string' ? item.text : ''))
      .join('');
  }

  return '';
}

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
  const [chatHistoryId] = useState(() => getOrCreateChatHistoryId());

  const handleSubmit = async (event) => {
    event.preventDefault();
    const messageText = userInput.trim();
    if (!messageText || isSending) {
      return;
    }

    const userMessage = { role: 'user', sender: 'Вы: ', text: messageText };
    const requestMessages = [...messages, userMessage];

    setMessages(requestMessages);
    setUserInput('');
    setIsSending(true);

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages: requestMessages.map((entry) => ({
            role: entry.role === 'user' ? 'user' : 'assistant',
            content: entry.text,
          })),
          chat_history_id: chatHistoryId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantText = extractAssistantText(data);

      setMessages((prev) => [...prev, { role: 'llm', sender: 'FinGPT: ', text: assistantText }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'llm',
          sender: 'FinGPT: ',
          text: `Извините, сейчас не получилось получить ответ. \
          Попробуйте связаться с админом или отправить сообщение ещё раз через несколько минут. \
          ${error?.message ? ` Техническая деталь: ${error.message}.` : ''}`,
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