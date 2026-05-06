import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { streamCelebrityLookalike } from '@/lib/claude';
import { ACCEPTED_MIME, MAX_IMAGE_BYTES, type AcceptedMime } from '@/lib/uploadConfig';

export const runtime = 'edge';
export const preferredRegion = ['icn1'];

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function detectMimeFromBytes(buffer: ArrayBuffer): AcceptedMime | null {
  const b = new Uint8Array(buffer);
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return 'image/webp';
  return null;
}

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
      { celebrities: [], error: '파일 크기는 500KB 이하여야 합니다.' },
      { status: 400 },
    );
  }

  // 분석 카운터 증가 (non-blocking)
  redis.incr('twin_celeb:analyze_count').catch(() => {});

  const arrayBuffer = await file.arrayBuffer();
  const detected = detectMimeFromBytes(arrayBuffer);
  if (!detected) {
    return NextResponse.json(
      { celebrities: [], error: '인식할 수 없는 이미지 형식입니다.' },
      { status: 400 },
    );
  }
  const base64 = arrayBufferToBase64(arrayBuffer);
  const mediaType = detected;

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
