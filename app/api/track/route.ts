import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const SHARE_KEY = 'twin_celeb:share_count';
const ANALYZE_KEY = 'twin_celeb:analyze_count';

export async function GET() {
  const [shareCount, analyzeCount] = await redis.mget<number[]>(SHARE_KEY, ANALYZE_KEY);
  return NextResponse.json({
    share_count: shareCount ?? 0,
    analyze_count: analyzeCount ?? 0,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { action?: string };
  const action = body?.action;

  if (action === 'share') {
    const newCount = await redis.incr(SHARE_KEY);
    return NextResponse.json({ share_count: newCount });
  }

  if (action === 'analyze') {
    const newCount = await redis.incr(ANALYZE_KEY);
    return NextResponse.json({ analyze_count: newCount });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
