import { describe, it, expect, vi } from "vitest";
import { streamFindCeleb, FindCelebError } from "@/lib/findCeleb";
import type { Celebrity } from "@/types";

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

function fakeFile(): File {
  return new File([new Uint8Array(8)], "x.jpg", { type: "image/jpeg" });
}

describe("streamFindCeleb", () => {
  it("parses NDJSON across chunk boundaries", async () => {
    const items = [
      { name: "A", reason: "r1" },
      { name: "B", reason: "r2" },
      { name: "C", reason: "r3" },
    ];
    const ndjson = items.map((i) => JSON.stringify(i)).join("\n") + "\n";
    const cut = Math.floor(ndjson.length / 2);
    const stream = makeStream([ndjson.slice(0, cut), ndjson.slice(cut)]);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const received: Celebrity[] = [];
    const { count } = await streamFindCeleb(
      fakeFile(),
      (c) => received.push(c),
      fetchMock as unknown as typeof fetch,
    );

    expect(count).toBe(3);
    expect(received.map((r) => (r as { name: string }).name)).toEqual(["A", "B", "C"]);
  });

  it("throws FindCelebError when a stream line has an error field", async () => {
    const stream = makeStream([
      JSON.stringify({ name: "A" }) + "\n",
      JSON.stringify({ error: "분석 실패" }) + "\n",
    ]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, body: stream });

    await expect(
      streamFindCeleb(fakeFile(), () => {}, fetchMock as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(FindCelebError);
  });

  it("throws FindCelebError with body message on non-OK response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      body: null,
      json: async () => ({ error: "용량 초과" }),
    });

    await expect(
      streamFindCeleb(fakeFile(), () => {}, fetchMock as unknown as typeof fetch),
    ).rejects.toThrow("용량 초과");
  });
});
