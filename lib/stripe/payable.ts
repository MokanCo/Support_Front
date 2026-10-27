/** Display-only payable totals. The charge itself is always computed on the server. */

export type StripeFeeQuote = {
  originalAmount: number;
  stripeProcessingFee: number;
  stripeChargeAmount: number;
  percent?: number;
  fixedFeeCents?: number;
};

export function stripeFeePercentLabel(stripeFee?: StripeFeeQuote | null) {
  const original = Number(stripeFee?.originalAmount);
  const fee = Number(stripeFee?.stripeProcessingFee);
  if (!Number.isFinite(original) || original <= 0 || !Number.isFinite(fee) || fee < 0) {
    return "";
  }
  const effective = (fee / original) * 100;
  return `${effective.toFixed(2)}%`;
}

/** Stripe's standard ACH Direct Debit pricing: 0.8%, capped at $5 per debit —
 *  same "customer pays the fee so the business nets the invoice amount"
 *  model already used for card. The server computes the authoritative charge;
 *  this is a display-only estimate using the same formula. */
export const ACH_FEE_PERCENT = 0.008;
export const ACH_FEE_CAP = 5;

export function achFeeFor(invoiceAmount: number): number {
  if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) return 0;
  return Math.round(Math.min(invoiceAmount * ACH_FEE_PERCENT, ACH_FEE_CAP) * 100) / 100;
}

/** Standard US domestic card pricing (2.9% + $0.30), gross-up formula so the
 *  business nets the invoice amount — matches the server's default
 *  STRIPE_FEE_PERCENT/STRIPE_FEE_FIXED_CENTS. Used to preview a saved-card
 *  direct charge before the server computes the authoritative amount. */
export const CARD_FEE_PERCENT = 2.9;
export const CARD_FEE_FIXED = 0.3;

export function cardFeeFor(invoiceAmount: number): { fee: number; total: number } {
  if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) return { fee: 0, total: 0 };
  const rate = CARD_FEE_PERCENT / 100;
  const total = Math.round(((invoiceAmount + CARD_FEE_FIXED) / (1 - rate)) * 100) / 100;
  const fee = Math.round((total - invoiceAmount) * 100) / 100;
  return { fee, total };
}

export function payableBreakdown(
  method: string,
  invoiceAmount: number,
  stripeFee?: StripeFeeQuote | null,
) {
  if (method === "stripe" && stripeFee) {
    return {
      invoiceAmount: stripeFee.originalAmount,
      processingFee: stripeFee.stripeProcessingFee,
      total: stripeFee.stripeChargeAmount,
      showFee: true,
      percentLabel: stripeFeePercentLabel(stripeFee),
    };
  }
  if (method === "ach") {
    const fee = achFeeFor(invoiceAmount);
    return {
      invoiceAmount,
      processingFee: fee,
      total: Math.round((invoiceAmount + fee) * 100) / 100,
      showFee: fee > 0,
      percentLabel:
        fee > 0
          ? fee >= ACH_FEE_CAP
            ? `${(ACH_FEE_PERCENT * 100).toFixed(2)}% (capped at $${ACH_FEE_CAP})`
            : `${(ACH_FEE_PERCENT * 100).toFixed(2)}%`
          : "",
    };
  }
  if (method === "card") {
    const { fee, total } = cardFeeFor(invoiceAmount);
    return {
      invoiceAmount,
      processingFee: fee,
      total,
      showFee: fee > 0,
      percentLabel: fee > 0 ? `${CARD_FEE_PERCENT}% + $${CARD_FEE_FIXED.toFixed(2)}` : "",
    };
  }
  return {
    invoiceAmount,
    processingFee: 0,
    total: invoiceAmount,
    showFee: false,
    percentLabel: "",
  };
}
