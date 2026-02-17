import { sendPayout as sendPayoutMP } from "./mercadopago";
import { sendPayout as sendPayoutMock } from "./mockbank";

export type PayoutRequest = {
  payoutId: string;
  amountCents: number;
  currency?: string;
  receiver: {
    accountNumber: string;
    accountType?: string;
    holderName?: string;
    holderDni?: string;
  };
  metadata?: Record<string, any>;
};

export type ProviderResult = {
  success: boolean;
  providerRef?: string;
  error?: string;
  raw?: any;
};

export async function sendPayoutToProvider(req: PayoutRequest): Promise<ProviderResult> {
  const provider = (process.env.PROVIDER_NAME || "mock").toLowerCase();

  if (provider === "mercadopago" || provider === "mp") {
    return sendPayoutMP(req);
  }
  return sendPayoutMock(req);
}