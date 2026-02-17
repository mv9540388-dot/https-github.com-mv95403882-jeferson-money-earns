import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const secret = req.headers["x-provider-webhook-secret"] || req.headers["x-webhook-secret"];
  if (String(secret) !== process.env.PROVIDER_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "invalid webhook secret" });
  }

  const body = req.body;
  const payoutId = body?.payoutId || body?.data?.payoutId || body?.data?.metadata?.payoutId;
  const providerRef = body?.providerRef || body?.data?.providerRef || body?.data?.id;
  const status = body?.status || body?.data?.status;

  if (!payoutId) return res.status(400).json({ error: "missing payout reference" });

  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) return res.status(404).json({ error: "payout not found" });

  if (status === "success" || status === "sent" || status === "completed") {
    await prisma.payout.update({ where: { id: payoutId }, data: { status: "sent", providerRef: providerRef || undefined } });
    await prisma.wallet.update({ where: { userId: payout.userId }, data: { pending: { decrement: payout.amount } } });
  } else if (status === "failed" || status === "rejected") {
    await prisma.payout.update({ where: { id: payoutId }, data: { status: "failed", reason: body?.reason || "provider_failed" } });
    await prisma.wallet.update({ where: { userId: payout.userId }, data: { balance: { increment: payout.amount }, pending: { decrement: payout.amount } } });
  } else {
    await prisma.payout.update({ where: { id: payoutId }, data: { status: String(status) || "processing" } });
  }

  res.json({ ok: true });
}