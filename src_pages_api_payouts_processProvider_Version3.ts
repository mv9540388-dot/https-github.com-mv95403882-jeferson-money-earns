import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getUserFromReq } from "../../../lib/auth";
import { sendPayoutToProvider } from "../../../services/providers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const token = getUserFromReq(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const role = (token as any).role;
  if (role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const { payoutId } = req.body;
  if (!payoutId) return res.status(400).json({ error: "payoutId required" });

  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) return res.status(404).json({ error: "payout not found" });

  if (payout.status !== "pending" && payout.status !== "processing")
    return res.status(400).json({ error: "payout not processable" });

  await prisma.payout.update({ where: { id: payoutId }, data: { status: "processing" } });

  try {
    const result = await sendPayoutToProvider({
      payoutId: payout.id,
      amountCents: payout.amount,
      currency: "PEN",
      receiver: { accountNumber: payout.accountNumber, accountType: payout.accountType, holderName: payout.holderName, holderDni: payout.holderDni },
      metadata: { internalPayoutId: payout.id },
    });

    if (result.success) {
      await prisma.payout.update({ where: { id: payoutId }, data: { status: "sent", providerRef: result.providerRef } });
      await prisma.wallet.update({ where: { userId: payout.userId }, data: { pending: { decrement: payout.amount } } });
      return res.json({ ok: true, providerRef: result.providerRef });
    } else {
      await prisma.payout.update({
        where: { id: payoutId },
        data: { status: "failed", reason: result.error || "provider_error" },
      });
      await prisma.wallet.update({
        where: { userId: payout.userId },
        data: { balance: { increment: payout.amount }, pending: { decrement: payout.amount } },
      });
      return res.status(500).json({ error: "provider_failed", details: result });
    }
  } catch (err: any) {
    await prisma.payout.update({ where: { id: payoutId }, data: { status: "failed", reason: String(err.message || err) } });
    await prisma.wallet.update({ where: { userId: payout.userId }, data: { balance: { increment: payout.amount }, pending: { decrement: payout.amount } } });
    return res.status(500).json({ error: "processing_error", details: String(err.message || err) });
  }
}