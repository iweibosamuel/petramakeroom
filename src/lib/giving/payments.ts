export type PaymentChargeStatus = "pending_manual" | "redirected" | "success" | "failed";

export interface PaymentChargeRequest {
  amountNaira: number;
  reference: string;
  payerEmail: string;
  payerName: string;
}

export interface PaymentChargeResult {
  status: PaymentChargeStatus;
  redirectUrl?: string;
  message?: string;
}

export interface PaymentProvider {
  name: string;
  initiateCharge(request: PaymentChargeRequest): Promise<PaymentChargeResult>;
}

/**
 * No payment gateway has been wired up yet. This provider records the
 * pledge/schedule (already handled by the data store) but does not move any
 * money — it just tells the UI to show a "we'll be in touch to collect
 * payment" style message instead of a fake success state.
 *
 * Swap this out once a gateway (Paystack/Flutterwave/etc.) is chosen: add a
 * new class implementing PaymentProvider that calls the real API, then
 * change the export below to use it.
 */
class ManualPendingPaymentProvider implements PaymentProvider {
  name = "manual-pending";

  async initiateCharge(): Promise<PaymentChargeResult> {
    return {
      status: "pending_manual",
      message:
        "Online payment isn't connected yet — your pledge and schedule are saved, and we'll follow up on how to complete payment.",
    };
  }
}

export const paymentProvider: PaymentProvider = new ManualPendingPaymentProvider();
