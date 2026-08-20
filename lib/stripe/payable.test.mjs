import assert from "node:assert/strict";
import { describe, it } from "node:test";

function stripeFeePercentLabel(stripeFee) {
  const original = Number(stripeFee?.originalAmount);
  const fee = Number(stripeFee?.stripeProcessingFee);
  if (!Number.isFinite(original) || original <= 0 || !Number.isFinite(fee) || fee < 0) {
    return "";
  }
  return `${((fee / original) * 100).toFixed(2)}%`;
}

function payableBreakdown(method, invoiceAmount, stripeFee) {
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

const quote100 = {
  originalAmount: 100,
  stripeProcessingFee: 3.3,
  stripeChargeAmount: 103.3,
  percent: 2.9,
  fixedFeeCents: 30,
};

describe("customer-facing payable totals", () => {
  it("shows Stripe fee only when Stripe is selected", () => {
    const stripe = payableBreakdown("stripe", 100, quote100);
    assert.equal(stripe.showFee, true);
    assert.equal(stripe.invoiceAmount, 100);
    assert.equal(stripe.processingFee, 3.3);
    assert.equal(stripe.total, 103.3);
    assert.equal(stripe.percentLabel, "3.30%");
  });

  it("restores the original invoice total for Zelle / ACH", () => {
    for (const method of ["zelle", "ach", "wire"]) {
      const other = payableBreakdown(method, 100, quote100);
      assert.equal(other.showFee, false);
      assert.equal(other.processingFee, 0);
      assert.equal(other.total, 100);
    }
  });
});
