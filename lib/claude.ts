import Anthropic from '@anthropic-ai/sdk';
import { Celebrity } from '@/types';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

const SYSTEM_PROMPT = `인상 분석 전문가로서 사진 속 인물의 분위기·인상을 분석해 닮은 연예인을 찾아드립니다.

순수 JSON만 반환하세요 (마크다운·추가 텍스트 금지):
{"celebrities":[{"name":"한국어이름","nameEn":"English Name","similarity":75,"nationality":"Korean","occupation":"직업","reasons":["이유1","이유2"]}]}

규칙:
- 한국 연예인 최소 1명 + 할리우드 스타 최소 1명 포함, 총 3명
- similarity: 50~95 정수
- reasons: 정확히 2개, 분위기·인상 위주 (외모 부위 비교 금지, 예: "차분하고 지적인 분위기", "선한 인상의 눈빛")
- 잘생기고 예쁜 연예인 편향 없이 실제 분위기 기준으로 선정
- 얼굴 없으면: {"celebrities":[],"error":"사진에서 얼굴을 찾을 수 없습니다."}`;

function parseCompleteCelebs(text: string): Celebrity[] {
  const celebs: Celebrity[] = [];

  const arrayMatch = text.match(/"celebrities"\s*:\s*\[/);
  if (!arrayMatch || arrayMatch.index === undefined) return celebs;

  let pos = arrayMatch.index + arrayMatch[0].length;

  while (pos < text.length) {
    while (pos < text.length && /[\s,]/.test(text[pos])) pos++;
    if (text[pos] !== '{') break;

    let depth = 0;
    let end = -1;
    for (let i = pos; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end === -1) break;

    try {
      celebs.push(JSON.parse(text.slice(pos, end)) as Celebrity);
      pos = end;
    } catch {
      break;
    }
  }

  return celebs;
}

export async function* streamCelebrityLookalike(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
): AsyncGenerator<Celebrity> {
  const anthropic = getClient();
  
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: '닮은 연예인 3명을 찾아주세요.' },
        ],
      },
    ],
  });

  let buffer = '';
  let yieldedCount = 0;

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      buffer += chunk.delta.text;

      const found = parseCompleteCelebs(buffer);
      for (let i = yieldedCount; i < found.length; i++) {
        yield found[i];
        yieldedCount++;
      }
    }
  }

  if (yieldedCount === 0) {
    const raw = buffer.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try {
      const parsed = JSON.parse(raw);
      if (parsed.error) throw new Error(parsed.error);
      for (const celeb of parsed.celebrities as Celebrity[]) yield celeb;
    } catch (err) {
      if (err instanceof Error && err.message.includes('celebrities')) {
        throw new Error('연예인 분석 중 오류가 발생했습니다.');
      }
      throw err;
    }
  }
}
