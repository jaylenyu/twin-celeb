import type { Celebrity } from "@/types";

export class FindCelebError extends Error {}

export interface StreamFindCelebResult {
  count: number;
}

export async function streamFindCeleb(
  file: File,
  onResult: (celeb: Celebrity) => void,
  fetchImpl: typeof fetch = fetch,
): Promise<StreamFindCelebResult> {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetchImpl("/api/find-celeb", { method: "POST", body: formData });
  if (!res.ok || !res.body) {
    let message = "오류가 발생했습니다.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new FindCelebError(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let count = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const data = JSON.parse(line);
      if (data.error) throw new FindCelebError(data.error);
      onResult(data as Celebrity);
      count++;
    }
  }

  return { count };
}
