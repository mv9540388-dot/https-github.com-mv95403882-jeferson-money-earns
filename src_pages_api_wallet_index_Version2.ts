import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getUserFromReq } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getUserFromReq(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const userId = (token as any).id;

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return res.json({ balance: 0, pending: 0 });
  res.json({ balance: wallet.balance, pending: wallet.pending });
}