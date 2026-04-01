import { NextResponse } from 'next/server';

// use LLMCITY_ENDPOINT if available, otherwise ollama chat API
const SERVER_CHAT_ENDPOINT =
  process.env.LLMCITY_ENDPOINT ||
  'http://localhost:11434/api/chat';

const MODEL =
  process.env.LLMCITY_MODEL || process.env.NEXT_PUBLIC_CHAT_MODEL || 'qwen3.5';

function logServerError(scope, details) {
  console.error(`[llmcity/chat] ${scope}`, details);
}

function buildPrompt(news, commentCount) {
  return `Ты аналитик медиа. Проанализируй тональность новости и сгенерируй реалистичные комментарии пользователей к ней.

Новость:
"""
${news}
"""

Верни ТОЛЬКО JSON без пояснений и markdown, строго в следующем формате:
{
  "sentiment": {
    "label": "positive" | "negative" | "neutral" | "mixed",
    "score": <число от -1.0 до 1.0>,
    "explanation": "<краткое объяснение тональности на русском, 1–2 предложения>"
  },
  "comments": [<массив из ровно ${commentCount} строк — реалистичные разнообразные комментарии пользователей на русском>]
}`;
}

function extractJson(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('No JSON found in LLM response');
}

function extractReplyText(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return '';
  }

  try {
    const parsed = JSON.parse(rawText);
    return (
      // Ollama native format
      parsed?.message?.content ||
      // OpenAI-compatible format
      parsed?.choices?.[0]?.message?.content ||
      parsed?.choices?.[0]?.text ||
      parsed?.reply ||
      parsed?.content ||
      rawText
    );
  } catch {
    const lines = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    let aggregated = '';
    for (const line of lines) {
      try {
        const chunk = JSON.parse(line);
        if (typeof chunk?.message?.content === 'string') {
          aggregated += chunk.message.content;
        } else if (typeof chunk?.response === 'string') {
          aggregated += chunk.response;
        }
      } catch {
      }
    }

    return aggregated || rawText;
  }
}

export async function POST(request) {
  try {
    const { news, commentCount = 5 } = await request.json();

    if (!news || typeof news !== 'string' || !news.trim()) {
      return NextResponse.json({ error: 'Текст новости обязателен' }, { status: 400 });
    }

    const count = Math.max(1, Math.min(20, Number(commentCount) || 5));
    const prompt = buildPrompt(news.trim(), count);

    const upstreamResponse = await fetch(SERVER_CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        stream: false,
      }),
      cache: 'no-store',
    });

    const rawText = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      logServerError('upstream_error', {
        endpoint: SERVER_CHAT_ENDPOINT,
        status: upstreamResponse.status,
        bodyPreview: rawText.slice(0, 500),
      });
      return NextResponse.json(
        { error: 'Ошибка сервера LLM', status: upstreamResponse.status, details: rawText },
        { status: upstreamResponse.status },
      );
    }

    const replyText = extractReplyText(rawText);

    try {
      const result = extractJson(replyText);
      return NextResponse.json(result);
    } catch (error) {
      logServerError('response_parse_error', {
        message: error?.message || 'Unknown parse error',
        replyPreview: replyText.slice(0, 500),
      });
      return NextResponse.json(
        { error: 'Не удалось разобрать ответ модели', raw: replyText },
        { status: 502 },
      );
    }
  } catch (error) {
    logServerError('internal_error', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error?.message || 'Unknown error' },
      { status: 500 },
    );
  }
}
