import Anthropic from '@anthropic-ai/sdk';
import { Celebrity } from '@/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `인상 분석 전문가로서 사진 속 인물의 분위기·인상을 분석해 닮은 연예인을 찾아드립니다.

순수 JSON만 반환하세요 (마크다운·추가 텍스트 금지):
{"celebrities":[{"name":"한국어이름","nameEn":"English Name","similarity":75,"nationality":"Korean","occupation":"직업","reasons":["이유1","이유2"]}]}

규칙:
- 한국 연예인 최소 1명 + 할리우드 스타 최소 1명 포함, 총 3명
- similarity: 50~95 정수
- reasons: 정확히 2개, 분위기·인상 위주 (외모 부위 비교 금지, 예: "차분하고 지적인 분위기", "선한 인상의 눈빛")
- 잘생기고 예쁜 연예인 편향 없이 실제 분위기 기준으로 선정
- 얼굴 없으면: {"celebrities":[],"error":"사진에서 얼굴을 찾을 수 없습니다."}`;

export async function findCelebrityLookalike(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
): Promise<Celebrity[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: '닮은 연예인 3명을 찾아주세요.',
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const raw = content.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(raw);

  if (parsed.error) {
    throw new Error(parsed.error);
  }

  return parsed.celebrities as Celebrity[];
}
