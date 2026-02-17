import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import prisma from "../../../lib/prisma";
import { getUserFromReq } from "../../../lib/auth";
import { uploadFileToS3, deleteLocalFile } from "../../../lib/s3";

export const config = { api: { bodyParser: false } };

const TEMP_DIR = path.join(process.cwd(), "tmp_uploads");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const token = getUserFromReq(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const userId = (token as any).id;

  const form = formidable({
    uploadDir: TEMP_DIR,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Upload failed" });
    const dni = (fields.dni as string) || undefined;
    const file = files.file as formidable.File | undefined;
    if (!file || !file.filepath) return res.status(400).json({ error: "file required" });

    try {
      const s3Key = `kyc/${userId}/${Date.now()}${path.extname(file.originalFilename || "")}`;
      const s3Uri = await uploadFileToS3(file.filepath, s3Key);
      const kyc = await prisma.kyc.upsert({
        where: { userId },
        update: { dniNumber: dni || undefined, filePath: s3Uri, status: "pending", updatedAt: new Date() },
        create: { userId, dniNumber: dni || undefined, filePath: s3Uri, status: "pending" },
      });
      deleteLocalFile(file.filepath);
      res.json({ ok: true, kyc: { id: kyc.id, status: kyc.status } });
    } catch (e: any) {
      return res.status(500).json({ error: String(e.message || e) });
    }
  });
}