import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { hashPassword, signToken } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: "Email already registered" });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      referralCode: Math.random().toString(36).slice(2, 9),
    },
  });

  await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });

  const bonusCents = parseInt(process.env.WELCOME_BONUS_CENTS || "1000", 10);
  if (bonusCents > 0) {
    await prisma.wallet.update({ where: { userId: user.id }, data: { balance: { increment: bonusCents } } });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
}