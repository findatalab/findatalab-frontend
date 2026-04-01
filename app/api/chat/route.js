import { NextResponse } from 'next/server';

const SERVER_CHAT_ENDPOINT = process.env.CHAT_ENDPOINT || 'http://localhost:1416/chat/completions';

export async function POST(request) {
  try {
    const payload = await request.json();

    const upstreamResponse = await fetch(SERVER_CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const rawText = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error: 'Upstream chat service error',
          status: upstreamResponse.status,
          details: rawText,
        },
        { status: upstreamResponse.status },
      );
    }

    const contentType = upstreamResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        return NextResponse.json(JSON.parse(rawText));
      } catch {
        return NextResponse.json({ reply: rawText });
      }
    }

    return NextResponse.json({ reply: rawText });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to reach chat service',
        details: error?.message || 'Unknown error',
      },
      { status: 500 },
    );
  }
}