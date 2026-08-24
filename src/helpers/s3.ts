import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});

const BUCKET = () => process.env.EVIDENCES_BUCKET!;

/** URL prefirmada para SUBIR una evidencia (5 minutos) */
export function presignUpload(key: string, contentType?: string): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 },
  );
}

/** URL firmada temporal para VER una evidencia (15 minutos) */
export function presignDownload(key: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET(),
      Key: key,
    }),
    { expiresIn: 900 },
  );
}

/** Clave estándar de almacenamiento de evidencias */
export function evidenceKey(userId: string, weightId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `evidencias/${userId}/${weightId}/${safeName}`;
}
