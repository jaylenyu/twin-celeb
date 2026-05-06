import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { compressImage } from "@/lib/imageCompression";

function makeFile(size: number, name = "photo.png", type = "image/png"): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("compressImage", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the original file when size is under the limit", async () => {
    const file = makeFile(1024);
    const result = await compressImage(file, { maxBytes: 4096 });
    expect(result).toBe(file);
  });

  it("compresses oversized files to a WebP below the limit", async () => {
    const file = makeFile(10 * 1024, "shot.png");

    let onloadHandler: (() => void) | null = null;
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 1600;
      height = 900;
      set src(_v: string) {
        onloadHandler = () => this.onload?.();
        queueMicrotask(() => onloadHandler?.());
      }
    }
    vi.stubGlobal("Image", MockImage);

    const toBlob = vi.fn((cb: BlobCallback) => {
      cb(new Blob([new Uint8Array(2 * 1024)], { type: "image/webp" }));
    });
    const drawImage = vi.fn();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage }),
          toBlob,
        } as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });

    const result = await compressImage(file, { maxBytes: 4 * 1024, outputMime: "image/webp" });
    expect(result.type).toBe("image/webp");
    expect(result.name).toBe("shot.webp");
    expect(result.size).toBeLessThanOrEqual(4 * 1024);
    expect(toBlob).toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalled();
  });

  it("labels the output File using the actual blob type (iOS WebP→PNG fallback)", async () => {
    const file = makeFile(10 * 1024, "shot.png");

    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 800;
      height = 600;
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", MockImage);

    const toBlob = vi.fn((cb: BlobCallback) => {
      cb(new Blob([new Uint8Array(2 * 1024)], { type: "image/png" }));
    });
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: vi.fn() }),
          toBlob,
        } as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });

    const result = await compressImage(file, { maxBytes: 4 * 1024, outputMime: "image/webp" });
    expect(result.type).toBe("image/png");
    expect(result.name).toBe("shot.png");
  });

  it("rejects when image fails to load", async () => {
    const file = makeFile(10 * 1024);

    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 100;
      height = 100;
      set src(_v: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal("Image", MockImage);

    await expect(compressImage(file, { maxBytes: 4 * 1024 })).rejects.toThrow("이미지 로드 실패");
  });
});
