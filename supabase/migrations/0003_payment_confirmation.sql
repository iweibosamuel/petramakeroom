-- Self-reported payments.
--
-- There's no payment gateway integration, so givers confirm their own
-- payments ("I've paid") and say how they paid. Finance can reconcile these
-- against bank/Paystack/Flutterwave/Zelle statements using the method,
-- optional reference and timestamp recorded here.

alter table installments
  add column payment_method text,
  add column payment_reference text,
  add column paid_at timestamptz;
