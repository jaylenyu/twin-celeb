import Anthropic from '@anthropic-ai/sdk';
import { Celebrity } from '@/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `당신은 인상 분석 전문가입니다. 사용자가 업로드한 사진 속 인물의 전체적인 분위기와 인상을 분석하여 닮은 연예인을 찾아드립니다.

다음 JSON 형식으로만 응답하세요. 마크다운 코드블록(\`\`\`)이나 다른 텍스트는 절대 포함하지 마세요. 반드시 순수 JSON만 반환하세요:
{
  "celebrities": [
    {
      "name": "한국어 이름",
      "nameEn": "English Name",
      "similarity": 닮음_정도_숫자(50-95 사이),
      "nationality": "Korean" 또는 "Hollywood",
      "occupation": "직업",
      "reasons": ["닮은 이유1", "닮은 이유2", "닮은 이유3"]
    }
  ]
}

규칙:
- 반드시 한국 연예인 최소 1명, 할리우드 스타 최소 1명 포함하여 총 3명 반환
- similarity는 50~95 사이 정수
- reasons는 2~3개, 반드시 전체적인 분위기·인상 위주로 작성 (예: "차분하고 지적인 분위기", "선한 인상의 눈빛", "부드럽고 온화한 전체적 인상")
- 사진에 사람이 없으면: {"celebrities": [], "error": "사진에서 얼굴을 찾을 수 없습니다."}

중요 - 분위기 중심 매칭 원칙:
- 눈코입 등 부분적 신체 특징 비교는 하지 마세요
- 사진을 봤을 때 느껴지는 전체적인 분위기, 인상, 눈빛, 표정의 결, 분위기가 주는 감정 등을 기준으로 매칭하세요
- "따뜻한 인상", "카리스마 있는 눈빛", "청순하고 맑은 분위기", "중성적이고 세련된 느낌" 등 인상과 분위기를 언어로 표현하세요
- 잘생기고 예쁜 연예인을 선호하는 편향을 피하고, 분위기가 실제로 유사한 연예인을 정직하게 선정하세요`;

export async function findCelebrityLookalike(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
): Promise<Celebrity[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
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
            text: '이 사람의 전체적인 분위기와 인상을 분석해서, 느낌이 가장 비슷한 한국 연예인 및 할리우드 스타를 각각 최소 1명씩 포함해 총 3명을 찾아주세요.',
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
