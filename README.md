# twin-celeb

사진을 업로드하면 Claude Vision이 인상·분위기를 분석해 닮은 한국/할리우드 연예인 3명을 추천하는 단일 페이지 웹 앱입니다. 서비스 도메인은 `https://twin-celeb.vercel.app`입니다.

## 프로젝트 개요

이 저장소는 단일 Next.js App Router 애플리케이션과 배포/CI 설정으로 구성됩니다.

- `app/`: App Router 페이지와 Edge/Node API route
- `components/`: 업로드/결과 UI 컴포넌트
- `lib/`: Claude SDK 래퍼, 업로드 정책, 압축, 스트리밍 클라이언트
- `store/`: Zustand 전역 상태
- `__tests__/`: Vitest 단위 테스트
- `.github/workflows/`: CI (typecheck, test, build)

핵심 사용자 흐름은 다음과 같습니다.

1. 사용자가 사진을 업로드하면 클라이언트가 WebP/JPEG로 압축합니다 (최대 500KB · 512px).
2. 압축본이 `POST /api/find-celeb`로 전송됩니다 (Edge runtime, region `icn1`).
3. 서버가 매직 바이트로 실제 이미지 포맷을 감지하고 base64로 인코딩합니다.
4. Claude Sonnet 4.6에 vision 메시지를 보내고 응답을 NDJSON 스트림으로 흘려보냅니다.
5. 클라이언트는 한 명씩 도착하는 결과를 점진적으로 렌더링합니다.

분석 외 부가 기능: 결과 카드 공유 이미지 생성(html-to-image + canvas), 누적 분석/공유 카운터(Upstash Redis).

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4 |
| AI | Anthropic Claude Sonnet 4.6 (Vision), `@anthropic-ai/sdk` |
| State | Zustand |
| 업로드 | react-dropzone, canvas 기반 클라이언트 압축 |
| 결과 공유 | html-to-image, Canvas 2D, Web Share API |
| 카운터 | Upstash Redis (REST) |
| Runtime | Vercel Edge Functions (`icn1`), Node 20 |
| 분석/모니터링 | Vercel Analytics, Sentry |
| Testing | Vitest 4, Testing Library, jsdom |
| CI/CD | GitHub Actions, Vercel |
| 패키지 매니저 | pnpm 10 |

## 저장소 구조

```text
twin-celeb/
├── .github/workflows/
│   └── ci.yml
├── app/
│   ├── api/
│   │   ├── find-celeb/route.ts
│   │   └── track/route.ts
│   ├── error.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── CelebResult.tsx
│   └── ImageUpload.tsx
├── lib/
│   ├── analytics.ts
│   ├── claude.ts
│   ├── findCeleb.ts
│   ├── imageCompression.ts
│   └── uploadConfig.ts
├── store/
│   └── useAppStore.ts
├── types/
│   └── index.ts
├── __tests__/
├── public/
├── instrumentation.ts
├── sentry.client.config.ts
├── sentry.server.config.ts
├── sentry.edge.config.ts
├── next.config.ts
├── vercel.json
├── vitest.config.ts
└── package.json
```

### 주요 디렉터리

| 경로 | 설명 |
| --- | --- |
| `app/page.tsx` | 업로드 → 분석 → 결과 상태 머신 |
| `app/api/find-celeb/route.ts` | 이미지 수신, 매직 바이트 검사, Claude 스트리밍 (Edge, `icn1`) |
| `app/api/track/route.ts` | 분석/공유 카운터 read·increment (Node) |
| `components/ImageUpload.tsx` | 모바일/데스크톱 업로드 UI |
| `components/CelebResult.tsx` | 결과 카드, 공유 이미지 합성, Web Share API |
| `lib/claude.ts` | Anthropic SDK 래퍼, 시스템 프롬프트, 점진적 JSON 파싱 |
| `lib/findCeleb.ts` | NDJSON 스트리밍 클라이언트 |
| `lib/imageCompression.ts` | 캔버스 기반 WebP/JPEG 반복 압축, 인코더 fallback |
| `lib/uploadConfig.ts` | 업로드 한도와 허용 MIME 등 공유 상수 |
| `lib/analytics.ts` | Vercel Analytics 이벤트 |
| `store/useAppStore.ts` | Zustand 상태 (selectedFile, results, error 등) |
| `types/index.ts` | `Celebrity`, `FindCelebResponse` 타입 |

## 분석 파이프라인

```text
브라우저
  -> 파일 선택 / 드롭
  -> compressImage (lib/imageCompression.ts)
       · WebP 인코딩 가능 여부 감지 (toDataURL)
       · 캔버스 리사이즈 → toBlob 반복 압축 (quality step)
       · blob.type 기반으로 File MIME/확장자 결정
  -> streamFindCeleb (lib/findCeleb.ts)
       · POST /api/find-celeb (FormData)

Edge route (icn1)
  -> ACCEPTED_MIME / MAX_IMAGE_BYTES 검증
  -> detectMimeFromBytes: PNG/JPEG/WebP 매직 바이트 검사
  -> arrayBufferToBase64 (chunked btoa, edge-safe)
  -> redis.incr('twin_celeb:analyze_count') (non-blocking)
  -> streamCelebrityLookalike (lib/claude.ts)

lib/claude.ts
  -> Anthropic Messages stream
       · model: claude-sonnet-4-6
       · max_tokens: 512
       · system: cache_control=ephemeral
  -> parseCompleteCelebs: 부분 JSON 텍스트에서 완성된 객체 단위로 분리
  -> AsyncGenerator<Celebrity>

브라우저
  -> ReadableStream → TextDecoder → NDJSON line split
  -> useAppStore.addResult(celeb) 한 명씩 추가 → 카드 점진 렌더
```

## 라우팅 / API

### 페이지

- `/`: 업로드 폼, 분석 진행, 결과 카드를 모두 담는 단일 페이지

### API

| 메소드 | 경로 | Runtime | 설명 |
| --- | --- | --- | --- |
| `POST` | `/api/find-celeb` | Edge (`icn1`) | 이미지 업로드 → Claude 스트리밍 응답을 NDJSON으로 반환 |
| `GET` | `/api/track` | Node | `analyze_count`, `share_count` 조회 |
| `POST` | `/api/track` | Node | `{ action: 'share' \| 'analyze' }` 카운터 증가 |

`POST /api/find-celeb` 응답은 `Content-Type: application/x-ndjson`이며, 한 줄에 하나의 `Celebrity` 객체 또는 `{"error": string}`이 옵니다.

## 이미지 처리 정책

`lib/uploadConfig.ts`에 한 곳으로 모아 둔 상수입니다.

| 상수 | 값 | 용도 |
| --- | --- | --- |
| `MAX_IMAGE_BYTES` | `500 * 1024` | 클라이언트 압축 목표·서버 거부 임계 |
| `MAX_DIMENSION` | `512` | 캔버스 리사이즈 한도 (긴 변 기준) |
| `INITIAL_QUALITY` | `0.8` | toBlob 시작 품질 |
| `MIN_QUALITY` | `0.4` | 더는 줄이지 않을 최소 품질 |
| `QUALITY_STEP` | `0.1` | 반복 압축 시 품질 감소 폭 |
| `ACCEPTED_MIME` | `image/jpeg`, `image/png`, `image/webp` | 업로드 허용 MIME |

추가 동작:

- 클라이언트: `canvas.toDataURL("image/webp")`로 WebP 인코딩 지원을 한 번 감지하고, 미지원 환경(iOS Safari 일부)은 처음부터 JPEG로 압축합니다.
- 결과 `File`의 MIME과 확장자는 캔버스가 실제 반환한 `blob.type`을 따릅니다.
- 서버: `file.type`을 신뢰하지 않고 ArrayBuffer 첫 바이트 시그니처로 PNG/JPEG/WebP를 식별하여 Claude `media_type`에 사용합니다.

## 환경 변수

로컬 개발에서는 `.env.local`을 사용합니다. Vercel Production/Preview 환경 변수는 대시보드에서 별도 관리합니다.

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | ✅ | Claude API 키 (서버 전용) |
| `UPSTASH_REDIS_REST_URL` | ✅ | Upstash Redis REST URL (분석/공유 카운터) |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash Redis REST 토큰 |
| `NEXT_PUBLIC_SENTRY_DSN` | 선택 | 클라이언트 Sentry DSN |
| `SENTRY_AUTH_TOKEN` | 선택 | 빌드 시 source map 업로드 |

주의사항:

- `ANTHROPIC_API_KEY`는 서버에서만 사용하며 절대 `NEXT_PUBLIC_*`로 노출하지 않습니다.
- `/api/find-celeb`는 Edge runtime이라 `Buffer` 같은 Node API를 사용할 수 없습니다. 신규 의존성을 추가할 때 edge 호환 여부를 확인합니다.

## 로컬 개발

### 요구사항

- Node.js 20.9+
- pnpm 10
- Anthropic API 키, Upstash Redis 계정

### 설치

```bash
pnpm install
```

`.env.local` 생성:

```bash
ANTHROPIC_API_KEY=sk-ant-...
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

### 개발 서버

```bash
pnpm dev
# http://localhost:3000
```

## 품질 검증

```bash
pnpm type-check       # tsc --noEmit
pnpm test             # vitest run
pnpm test:watch       # 변경 감지 모드
pnpm build            # 프로덕션 빌드 (Edge route 포함)
```

## 배포

- 호스팅: Vercel
- `/api/find-celeb`는 `runtime = 'edge'`, `preferredRegion = ['icn1']`로 한국 사용자 라운드트립을 단축합니다.
- `vercel.json`은 `pnpm install --frozen-lockfile`과 `pnpm build`만 정의하고 그 외는 Next.js 기본값을 따릅니다.
- 환경 변수는 Vercel 프로젝트 대시보드 → Settings → Environment Variables에서 관리합니다.

## GitHub Actions

| 워크플로우 | 트리거 | 역할 |
| --- | --- | --- |
| `ci.yml` | `main`/`develop` push, 동일 브랜치 PR | pnpm install → `type-check` → `test` → `build` |

CI job 이름은 `Type Check & Test & Build`입니다. 빌드 단계에는 `ANTHROPIC_API_KEY`가 secret으로 주입됩니다.

## 트러블슈팅

| 증상 | 점검 포인트 |
| --- | --- |
| 분석 시 `400 invalid_request_error` (`media type ... but the image appears to be ...`) | iOS Safari 등에서 WebP 인코더가 PNG로 폴백한 케이스. 현재는 클라이언트의 `detectOutputMime` + 서버의 `detectMimeFromBytes`로 보호됨. 재발 시 두 함수가 호출되는지 로깅으로 확인 |
| `파일 크기는 500KB 이하여야 합니다.` 에러 반복 | 입력 파일이 매우 크면 압축 후에도 한도 초과 가능. 압축 파라미터(`MIN_QUALITY`, `MAX_DIMENSION`) 조정 검토 |
| `JPG, PNG, WEBP 형식만 지원합니다.` | iOS HEIC 사진은 미지원. 카메라 설정에서 "호환성 우선"으로 변경하거나, 서버 변환 도입 필요 |
| `네트워크 오류가 발생했습니다. 다시 시도해주세요.` | Edge 함수 cold start, Anthropic 응답 지연, 또는 SDK 호환성 문제. Sentry/Vercel logs에서 `streamCelebrityLookalike` 예외 확인 |
| 분석 카운터/공유 카운터가 갱신되지 않음 | `UPSTASH_REDIS_REST_URL/TOKEN` 누락 여부 확인. 카운터 증가는 non-blocking이라 실패해도 응답은 정상 |
| 공유 이미지가 깨짐 | `html-to-image`가 외부 이미지를 inlining하지 못한 경우. 사용자 사진은 `data:` URL로 변환된 상태여야 함 (`page.tsx`의 `blobUrlToDataUrl`) |

## 라이선스

별도 오픈소스 라이선스를 부여하지 않은 개인 프로젝트입니다.
