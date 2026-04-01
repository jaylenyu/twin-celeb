import { NextRequest, NextResponse } from 'next/server';
import { streamCelebrityLookalike } from '@/lib/claude';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMediaType = typeof ALLOWED_TYPES[number];

const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB (클라이언트에서 압축 후 전송)

export async function POST(request: NextRequest): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('image') as File | null;

  if (!file) {
    return NextResponse.json({ celebrities: [], error: '이미지가 없습니다.' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type as AllowedMediaType)) {
    return NextResponse.json(
      { celebrities: [], error: 'JPG, PNG, WEBP 형식만 지원합니다.' },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { celebrities: [], error: '파일 크기는 1MB 이하여야 합니다.' },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mediaType = file.type as AllowedMediaType;

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
