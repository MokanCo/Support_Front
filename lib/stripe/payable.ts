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
  return {
    invoiceAmount,
    processingFee: 0,
    total: invoiceAmount,
    showFee: false,
    percentLabel: "",
  };
}
