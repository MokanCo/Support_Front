"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session-context";
import { canManageAr } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import {
  archiveArProduct,
  createArProduct,
  deleteArProduct,
  fetchArProducts,
  moneyFmt,
  updateArProduct,
  type ArProduct,
} from "@/lib/queries/ar";

type ProductForm = {
  name: string;
  description: string;
  category: string;
  price: string;
  taxable: boolean;
  taxPercentage: string;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  category: "",
  price: "",
  taxable: true,
  taxPercentage: "0",
};

export default function ArProductsPage() {
  const { user } = useSession();
  const manage = canManageAr(user.role);
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ArProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ar", "products"],
    queryFn: () => fetchArProducts({ pageSize: 200 }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        price: Number(form.price) || 0,
        taxable: form.taxable,
        taxPercentage: Number(form.taxPercentage) || 0,
      };
      if (editing) return updateArProduct(editing.id, body);
      return createArProduct(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "products"] });
      closeModal();
    },
    onError: (e: Error) => setError(e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveArProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ar", "products"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteArProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ar", "products"] }),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(product: ArProduct) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      category: product.category ?? "",
      price: String(product.price ?? 0),
      taxable: product.taxable ?? true,
      taxPercentage: String(product.taxPercentage ?? 0),
    });
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setError(null);
  }

  const products = data?.products ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Products"
          description="Billable products and services for invoicing"
          action={
            manage ? (
              <Button size="sm" onClick={openCreate}>
                Add product
              </Button>
            ) : undefined
          }
        />
        <CardBody className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No products yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Price</th>
                  <th className="px-6 py-3 font-medium">Tax</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  {manage ? <th className="px-6 py-3 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-900">{p.name}</div>
                      {p.description ? (
                        <div className="text-xs text-slate-500">{p.description}</div>
                      ) : null}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{p.category || "—"}</td>
                    <td className="px-6 py-3 text-slate-900">{moneyFmt(p.price)}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {p.taxable ? `${p.taxPercentage ?? 0}%` : "Non-taxable"}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.isActive !== false
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {p.isActive !== false ? "Active" : "Archived"}
                      </span>
                    </td>
                    {manage ? (
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                            Edit
                          </Button>
                          {p.isActive !== false ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={archiveMutation.isPending}
                              onClick={() => archiveMutation.mutate(p.id)}
                            >
                              Archive
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (confirm("Delete this product permanently?")) {
                                deleteMutation.mutate(p.id);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? "Edit product" : "New product"}
        onClose={closeModal}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Input
            label="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <Input
            label="Price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            required
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.taxable}
              onChange={(e) => setForm((f) => ({ ...f, taxable: e.target.checked }))}
            />
            Taxable
          </label>
          {form.taxable ? (
            <Input
              label="Tax percentage"
              type="number"
              min="0"
              step="0.01"
              value={form.taxPercentage}
              onChange={(e) => setForm((f) => ({ ...f, taxPercentage: e.target.value }))}
            />
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              disabled={!form.name.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
