import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_S3_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function uploadFileToS3(localFilePath: string, key: string) {
  if (!BUCKET) throw new Error("S3 bucket not configured");
  const fileStream = fs.createReadStream(localFilePath);
  const parallelUpload = new Upload({
    client: s3,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: fileStream,
      ACL: "private",
    },
  });
  await parallelUpload.done();
  return `s3://${BUCKET}/${key}`;
}

export async function deleteLocalFile(fp: string) {
  try { fs.unlinkSync(fp); } catch (e) {}
}