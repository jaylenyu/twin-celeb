# Twin Celeb — 나의 쌍둥이 연예인 찾기

사진을 올리면 AI가 당신과 분위기가 닮은 한국/할리우드 연예인을 찾아드립니다.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)
![Claude](https://img.shields.io/badge/Claude-claude--sonnet--4--6-orange)

## 기능

- 사진 업로드 (드래그 앤 드롭 / 파일 선택)
- Claude Vision API로 분위기 분석
- 한국 연예인 + 할리우드 스타 매칭 (최소 각 1명)
- 유사도 퍼센트 및 닮은 이유 제공

## 기술 스택

| 항목 | 사용 기술 |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| AI | Anthropic Claude claude-sonnet-4-6 |
| Deploy | Vercel |

## 로컬 실행

```bash
pnpm install
```

`.env.local` 파일 생성:

```
ANTHROPIC_API_KEY=your_api_key_here
```

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인

## 파일 구조

```
app/
├── api/find-celeb/route.ts   # Claude API 연동 엔드포인트
├── page.tsx                  # 메인 페이지
└── layout.tsx
components/
├── ImageUpload.tsx            # 이미지 업로드 UI
├── CelebResult.tsx            # 결과 표시
└── LoadingSpinner.tsx
lib/
└── claude.ts                  # Claude SDK 래퍼
```

## 제약 사항

- 지원 형식: JPEG, PNG, WEBP
- 최대 파일 크기: 5MB
- 인물이 포함된 사진만 분석 가능
