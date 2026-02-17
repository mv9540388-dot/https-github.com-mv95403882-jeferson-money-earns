import type { PayoutRequest, ProviderResult } from "./index";

export async function sendPayout(req: PayoutRequest): Promise<ProviderResult> {
  const { payoutId, amountCents, receiver } = req;
  await new Promise(r => setTimeout(r, 700));
  const providerRef = `MOCKBANK_${receiver.accountNumber || "ACC"}_${Date.now()}`;
  return {
    success: true,
    providerRef,
    raw: { simulated: true, payoutId, amountCents, receiver },
  };
}