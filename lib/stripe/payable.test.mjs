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

const ACH_FEE_PERCENT = 0.008;
const ACH_FEE_CAP = 5;

function achFeeFor(invoiceAmount) {
  if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) return 0;
  return Math.round(Math.min(invoiceAmount * ACH_FEE_PERCENT, ACH_FEE_CAP) * 100) / 100;
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

  it("restores the original invoice total for Zelle / wire (no processing fee)", () => {
    for (const method of ["zelle", "wire"]) {
      const other = payableBreakdown(method, 100, quote100);
      assert.equal(other.showFee, false);
      assert.equal(other.processingFee, 0);
      assert.equal(other.total, 100);
    }
  });

  it("adds the 0.8% ACH fee (uncapped case)", () => {
    const ach = payableBreakdown("ach", 100, quote100);
    assert.equal(ach.showFee, true);
    assert.equal(ach.invoiceAmount, 100);
    assert.equal(ach.processingFee, 0.8);
    assert.equal(ach.total, 100.8);
    assert.equal(ach.percentLabel, "0.80%");
  });

  it("caps the ACH fee at $5", () => {
    const ach = payableBreakdown("ach", 10000, quote100);
    assert.equal(ach.processingFee, 5);
    assert.equal(ach.total, 10005);
    assert.equal(ach.percentLabel, "0.80% (capped at $5)");
  });
});
