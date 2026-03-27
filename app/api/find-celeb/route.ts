import { NextRequest, NextResponse } from 'next/server';
import { findCelebrityLookalike } from '@/lib/claude';
import { FindCelebResponse } from '@/types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMediaType = typeof ALLOWED_TYPES[number];

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest): Promise<NextResponse<FindCelebResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ celebrities: [], error: '이미지가 없습니다.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type as AllowedMediaType)) {
      return NextResponse.json(
        { celebrities: [], error: 'JPG, PNG, WEBP 형식만 지원합니다.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { celebrities: [], error: '파일 크기는 5MB 이하여야 합니다.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const celebrities = await findCelebrityLookalike(base64, file.type as AllowedMediaType);

    return NextResponse.json({ celebrities });
  } catch (err) {
    const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.';
    return NextResponse.json({ celebrities: [], error: message }, { status: 500 });
  }
}
