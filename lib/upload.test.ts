import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, checkUpload, objectKey, sniffImage } from "./upload";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);
const svg = new Uint8Array(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'>"));
const gif = new Uint8Array(Buffer.from("GIF89a......"));

describe("sniffImage — 확장자·Content-Type 이 아니라 바이트로 판정", () => {
  it("jpeg/png/webp", () => {
    expect(sniffImage(jpeg)?.ext).toBe("jpg");
    expect(sniffImage(png)?.ext).toBe("png");
    expect(sniffImage(webp)?.ext).toBe("webp");
  });
  it("svg(스크립트 삽입 가능)·gif·짧은 입력은 거부", () => {
    expect(sniffImage(svg)).toBeNull();
    expect(sniffImage(gif)).toBeNull();
    expect(sniffImage(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("checkUpload", () => {
  it("크기 상한", () => {
    expect(checkUpload(MAX_UPLOAD_BYTES, jpeg).ok).toBe(true);
    expect(checkUpload(MAX_UPLOAD_BYTES + 1, jpeg)).toMatchObject({ ok: false, status: 413 });
    expect(checkUpload(0, jpeg)).toMatchObject({ ok: false, status: 400 });
  });
  it("형식이 아니면 415", () => {
    expect(checkUpload(100, svg)).toMatchObject({ ok: false, status: 415 });
  });
});

describe("objectKey", () => {
  it("판매자별 prefix 아래 — MinIO 정책 범위와 일치해야 한다", () => {
    expect(objectKey(7, "png", "abc")).toBe("cdn/products/partner/7/abc.png");
  });
});
