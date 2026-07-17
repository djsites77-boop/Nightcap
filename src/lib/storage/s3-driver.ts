import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { DocumentStorage } from "./index";

/**
 * Production storage driver (spec §12) — private bucket, short-lived
 * presigned GET URLs, never a public object URL. Needs real credentials:
 * DOCUMENT_STORAGE_S3_BUCKET, AWS_REGION, and standard AWS credential env
 * vars (or an attached IAM role). Not exercised in this session — there's no
 * bucket to point it at — but it follows the AWS SDK v3 documented pattern.
 */
export class S3DocumentStorage implements DocumentStorage {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = requireEnv("DOCUMENT_STORAGE_S3_BUCKET");
    this.client = new S3Client({ region: process.env.AWS_REGION ?? "ca-central-1" });
  }

  async put(key: string, data: Buffer, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: mimeType,
        // No ACL: public-read, ever — the bucket itself should block public access.
      })
    );
  }

  async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}
