import mercadopago from "mercadopago";
import fetch from "node-fetch";
import type { PayoutRequest, ProviderResult } from "./index";

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN_SANDBOX || process.env.MERCADOPAGO_ACCESS_TOKEN;
const API_URL = process.env.MERCADOPAGO_API_URL || "https://api.mercadopago.com";

if (ACCESS_TOKEN) {
  mercadopago.configure({ access_token: ACCESS_TOKEN });
}

export async function sendPayout(req: PayoutRequest): Promise<ProviderResult> {
  const { payoutId, amountCents, receiver, metadata } = req;
  const amount = (amountCents / 100).toFixed(2);

  if (!ACCESS_TOKEN) {
    return {
      success: true,
      providerRef: `MP_MOCK_${Date.now()}`,
      raw: { message: "no access token configured - simulated payout" },
    };
  }

  try {
    const body: any = {
      amount: {
        value: amount,
        currency: "PEN",
      },
      metadata: { payoutId, ...metadata },
      description: `Payout ${payoutId} - Jeferson Money Earns`,
      receiver: {
        account: receiver.accountNumber,
        account_type: receiver.accountType,
        holder_name: receiver.holderName,
      },
    };

    const resp = await fetch(`${API_URL}/payouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { success: false, error: `provider_error_${resp.status}`, raw: text };
    }

    const json = await resp.json();
    const providerRef = json.id || json.transfer_id || `MP_RESP_${Date.now()}`;

    return { success: true, providerRef, raw: json };
  } catch (err: any) {
    return { success: false, error: String(err.message || err), raw: err };
  }
}