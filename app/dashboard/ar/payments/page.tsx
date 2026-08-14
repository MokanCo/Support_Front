"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session-context";
import { canManageAr } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { fetchArPayments, moneyFmt, recordArPayment } from "@/lib/queries/ar";

const PAYMENT_METHODS = ["zelle", "check", "wire", "ach", "cash", "credit_card", "other"];

export default function ArPaymentsPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("zelle");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ar", "payments"],
    queryFn: () => fetchArPayments({ pageSize: 200 }),
  });

  const recordMutation = useMutation({
    mutationFn: () =>
      recordArPayment({
        invoiceId: invoiceId.trim(),
        amount: Number(amount) || 0,
        paymentDate,
        paymentMethod,
        transactionReference: transactionReference.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "payments"] });
      queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
      setModalOpen(false);
      setInvoiceId("");
      setAmount("");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod("zelle");
      setTransactionReference("");
      setNotes("");
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const payments = data?.payments ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Payments"
          description="Recorded payments against invoices"
          action={
            manage ? (
              <Button size="sm" onClick={() => setModalOpen(true)}>
                Record payment
              </Button>
            ) : undefined
          }
        />
        <CardBody className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading payments…</p>
          ) : payments.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No payments recorded yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Invoice</th>
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Method</th>
                  <th className="px-6 py-3 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-slate-600">
                      {p.paymentDate?.slice(0, 10) ?? "—"}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {p.invoiceNumber ?? p.invoiceId}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{p.locationName ?? "—"}</td>
                    <td className="px-6 py-3 text-slate-900">{moneyFmt(p.amount)}</td>
                    <td className="px-6 py-3 capitalize text-slate-600">
                      {(p.paymentMethod ?? "—").replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {p.transactionReference || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Modal open={modalOpen} title="Record payment" onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <Input
            label="Invoice ID"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            required
          />
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Input
            label="Payment date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
          <Select
            label="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
          <Input
            label="Transaction reference"
            value={transactionReference}
            onChange={(e) => setTransactionReference(e.target.value)}
          />
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!invoiceId.trim() || !amount || recordMutation.isPending}
              onClick={() => recordMutation.mutate()}
            >
              {recordMutation.isPending ? "Saving…" : "Record payment"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
