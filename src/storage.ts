import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "./env.js";

// Neon Object Storage is S3-compatible.
export function createS3(): S3Client {
  return new S3Client({
    region: env.awsRegion,
    endpoint: env.awsEndpointUrlS3,
    credentials: {
      accessKeyId: env.awsAccessKeyId ?? "",
      secretAccessKey: env.awsSecretAccessKey ?? "",
    },
    forcePathStyle: true,
  });
}

export async function listBuckets(): Promise<string[]> {
  const s3 = createS3();
  const res = await s3.send(new ListBucketsCommand({}));
  return res.Buckets?.map((b) => b.Name ?? "") ?? [];
}

export async function listObjects(bucket: string): Promise<string[]> {
  const s3 = createS3();
  const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
  return res.Contents?.map((o) => o.Key ?? "") ?? [];
}

export async function putTestObject(bucket: string, key: string, body: string): Promise<void> {
  const s3 = createS3();
  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "text/plain" }),
  );
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  const s3 = createS3();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
