import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { streamCelebrityLookalike } from '@/lib/claude';
import { ACCEPTED_MIME, MAX_IMAGE_BYTES, type AcceptedMime } from '@/lib/uploadConfig';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('image') as File | null;

  if (!file) {
    return NextResponse.json({ celebrities: [], error: '이미지가 없습니다.' }, { status: 400 });
  }
  if (!ACCEPTED_MIME.includes(file.type as AcceptedMime)) {
    return NextResponse.json(
      { celebrities: [], error: 'JPG, PNG, WEBP 형식만 지원합니다.' },
      { status: 400 },
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { celebrities: [], error: '파일 크기는 3MB 이하여야 합니다.' },
      { status: 400 },
    );
  }

  // 분석 카운터 증가 (non-blocking)
  redis.incr('twin_celeb:analyze_count').catch(() => {});

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mediaType = file.type as AcceptedMime;

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const celeb of streamCelebrityLookalike(base64, mediaType)) {
          controller.enqueue(encoder.encode(JSON.stringify(celeb) + '\n'));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.';
        controller.enqueue(encoder.encode(JSON.stringify({ error: message }) + '\n'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}
