import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getUserFromReq } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const token = getUserFromReq(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const userId = (token as any).id;

  const { amountCents, bank, accountNumber, accountType, holderName, holderDni } = req.body;
  if (!amountCents || amountCents <= 0) return res.status(400).json({ error: "amountCents required" });
  if (!bank || !accountNumber || !holderName || !holderDni) return res.status(400).json({ error: "banking details required" });

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return res.status(500).json({ error: "wallet not found" });
  if (wallet.balance < amountCents) return res.status(400).json({ error: "insufficient funds" });

  const kyc = await prisma.kyc.findUnique({ where: { userId } });
  if (!kyc || kyc.status !== "approved") {
    return res.status(403).json({ error: "KYC not approved. Cannot withdraw." });
  }

  const payout = await prisma.payout.create({
    data: {
      userId,
      amount: amountCents,
      bank,
      accountNumber,
      accountType,
      holderName,
      holderDni,
      method: process.env.PROVIDER_NAME || "mock",
      status: "pending",
    },
  });

  await prisma.wallet.update({
    where: { userId },
    data: { balance: { decrement: amountCents }, pending: { increment: amountCents } },
  });

  res.json({ ok: true, payoutId: payout.id, status: payout.status });
}