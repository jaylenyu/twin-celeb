# Twin Celeb

사진을 올리면 AI가 분위기가 닮은 한국/할리우드 연예인을 찾아드립니다.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)
![Claude](https://img.shields.io/badge/Claude-Sonnet_4.6-d97706)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black)

---

## 기능

- **분위기 기반 매칭** — 외모 특징이 아닌 전체적인 인상과 분위기로 매칭
- **이미지 업로드** — 드래그 앤 드롭 (데스크톱) / 카메라·앨범 선택 (모바일)
- **자동 압축** — 용량 제한 없음, 5MB 초과 시 자동 압축
- **한국 + 할리우드** — 최소 각 1명씩 총 3명 결과 제공
- **유사도 및 이유** — 닮음 퍼센트와 분위기 설명 제공
- **결과 공유** — 업로드 사진 포함 이미지로 친구에게 공유

## 기술 스택

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| AI | Anthropic Claude Sonnet 4.6 (Vision) |
| Monitoring | Sentry |
| Deploy | Vercel |

## 로컬 실행

```bash
pnpm install
```

`.env.local` 생성:

```
ANTHROPIC_API_KEY=your_api_key_here
```

```bash
pnpm dev
# http://localhost:3000
```

## 프로젝트 구조

```
app/
├── api/find-celeb/route.ts   # 이미지 수신 및 Claude API 호출
├── page.tsx                  # 메인 페이지
└── layout.tsx
components/
├── ImageUpload.tsx           # 업로드 UI (압축 포함)
└── CelebResult.tsx           # 결과 카드 및 공유 기능
lib/
└── claude.ts                 # Claude Vision API 연동
types/
└── index.ts                  # Celebrity, FindCelebResponse 타입
```

## 환경 변수

| 변수 | 설명 |
|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API 키 ([발급](https://console.anthropic.com)) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry 에러 모니터링 DSN ([설정](https://sentry.io)) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (통계 카운팅) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis 토큰 |
