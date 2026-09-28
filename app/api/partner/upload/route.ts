import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { verifyPartnerToken } from "@/lib/auth";
import { verifiedToken } from "@/lib/backend";
import { MAX_UPLOAD_BYTES, checkUpload, objectKey } from "@/lib/upload";

// admin.front 는 MinIO root 자격증명을 쓰지만, 이 앱은 외부 판매자가 쓰는 포털이다. 여기에는
// `shop-images/cdn/products/partner/*` 에 PutObject 만 가능한 전용 계정을 넣는다(gateway#279).
const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT ?? "http://minio.minio.svc.cluster.local:9000",
  region: "minio",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? "",
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? "",
  },
  forcePathStyle: true,
});
const BUCKET = "shop-images";
const PUBLIC_BASE_URL = "https://image.posselect.com";

export async function POST(request: NextRequest) {
  const token = verifiedToken(request);
  const claims = token ? await verifyPartnerToken(token) : null;
  if (!claims) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // formData() 가 본문을 전부 메모리에 올리기 전에 선언된 길이로 먼저 거른다(multipart 오버헤드 여유 64KB).
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "이미지는 5MB 이하만 올릴 수 있습니다." }, { status: 413 });
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "잘못된 업로드 요청입니다." }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(bytes.byteLength, bytes.subarray(0, 16));
  if (!check.ok) return NextResponse.json({ error: check.message }, { status: check.status });

  const key = objectKey(claims.sellerId, check.kind.ext, crypto.randomUUID());
  try {
    await s3.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: check.kind.contentType }),
    );
  } catch (e) {
    console.error("[upload] MinIO 저장 실패", e);
    return NextResponse.json({ error: "이미지 저장에 실패했습니다." }, { status: 502 });
  }
  return NextResponse.json({ imageUrl: `${PUBLIC_BASE_URL}/${key}` });
}
