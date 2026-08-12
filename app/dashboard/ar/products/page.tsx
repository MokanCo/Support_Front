"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  BadgePercent,
  Loader2,
  Package,
  Receipt,
} from "lucide-react";
import { DataTable, type Column } from "@/components/ar/ui/data-table";
import { ArFilterBar } from "@/components/ar/ui/filter-bar";
import { KpiCard, KpiCardSkeleton } from "@/components/ar/ui/kpi-card";
import { Panel, PanelBody, PanelHeader } from "@/components/ar/ui/panel";
import { Amount, Chip, ErrorState } from "@/components/ar/ui/primitives";
import { useArToast } from "@/components/ar/ui/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import { useArFilters } from "@/lib/ar/filters";
import { count, money, toNumber } from "@/lib/ar/format";
import { canManageAr } from "@/lib/permissions";
import {
  archiveArProduct,
  createArProduct,
  deleteArProduct,
  fetchArProducts,
  updateArProduct,
  type ArProduct,
} from "@/lib/queries/ar";
import { useSession } from "@/lib/session-context";

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
  const toast = useArToast();
  const queryClient = useQueryClient();
  const { filters } = useArFilters();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ArProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
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
      toast.success(editing ? "Product updated" : "Product created");
      closeModal();
    },
    onError: (e: Error) => {
      setFormError(e.message);
      toast.error("Could not save product", e.message);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveArProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "products"] });
      toast.success("Product archived");
    },
    onError: (e: Error) => toast.error("Could not archive product", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteArProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "products"] });
      toast.success("Product deleted");
    },
    onError: (e: Error) => toast.error("Could not delete product", e.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
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
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
  }

  const allProducts = data?.products ?? [];
  const products = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    if (!term) return allProducts;
    return allProducts.filter((p) => {
      const hay = `${p.name} ${p.category ?? ""} ${p.description ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [allProducts, filters.search]);

  const kpis = useMemo(() => {
    const active = products.filter((p) => p.isActive !== false).length;
    const archived = products.filter((p) => p.isActive === false).length;
    const avgPrice =
      products.length > 0
        ? products.reduce((s, p) => s + toNumber(p.price), 0) / products.length
        : 0;
    const taxable = products.filter((p) => p.taxable).length;
    return { active, archived, avgPrice, taxable };
  }, [products]);

  const columns = useMemo<Column<ArProduct>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessor: (r) => r.name,
        cell: (r) => (
          <span className="font-medium text-slate-900">{r.name}</span>
        ),
      },
      {
        id: "category",
        header: "Category",
        accessor: (r) => r.category ?? "",
        cell: (r) =>
          r.category ? <Chip>{r.category}</Chip> : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: "description",
        header: "Description",
        accessor: (r) => r.description ?? "",
        cell: (r) => (
          <span className="line-clamp-2 max-w-xs text-slate-600">
            {r.description?.trim() || "—"}
          </span>
        ),
      },
      {
        id: "price",
        header: "Price",
        accessor: (r) => toNumber(r.price),
        align: "right",
        cell: (r) => <Amount value={toNumber(r.price)} />,
      },
      {
        id: "taxable",
        header: "Taxable",
        accessor: (r) => (r.taxable ? "yes" : "no"),
        cell: (r) =>
          r.taxable ? (
            <Chip tone="pending">
              Taxable{r.taxPercentage != null ? ` ${r.taxPercentage}%` : ""}
            </Chip>
          ) : (
            <Chip>Non-taxable</Chip>
          ),
      },
      {
        id: "status",
        header: "Status",
        accessor: (r) => (r.isActive !== false ? "active" : "archived"),
        cell: (r) =>
          r.isActive !== false ? (
            <Chip tone="positive">Active</Chip>
          ) : (
            <Chip>Archived</Chip>
          ),
      },
      {
        id: "actions",
        header: "Actions",
        accessor: () => "",
        sortable: false,
        locked: true,
        cell: (r) =>
          manage ? (
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(r);
                }}
              >
                Edit
              </Button>
              {r.isActive !== false ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={archiveMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveMutation.mutate(r.id);
                  }}
                >
                  {archiveMutation.isPending && archiveMutation.variables === r.id ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Archiving…
                    </>
                  ) : (
                    "Archive"
                  )}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this product permanently?")) {
                    deleteMutation.mutate(r.id);
                  }
                }}
              >
                {deleteMutation.isPending && deleteMutation.variables === r.id ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          ) : null,
      },
    ],
    [
      manage,
      archiveMutation.isPending,
      archiveMutation.variables,
      deleteMutation.isPending,
      deleteMutation.variables,
    ],
  );

  if (error) {
    return (
      <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
    );
  }

  return (
    <div className="space-y-5">
      <Panel className="sticky top-0 z-30" padded={false} overflowVisible>
        <div className="px-4 py-3 sm:px-5">
          <ArFilterBar
            showDateRange={false}
            showCustomer={false}
            showStatus={false}
            showPaymentStatus={false}
            searchPlaceholder="Search products…"
          />
        </div>
      </Panel>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Active products"
            value={count(kpis.active)}
            icon={Package}
            accent="blue"
            changePct={null}
          />
          <KpiCard
            label="Archived"
            value={count(kpis.archived)}
            icon={Archive}
            accent="slate"
            changePct={null}
          />
          <KpiCard
            label="Average price"
            value={money(kpis.avgPrice)}
            icon={Receipt}
            accent="purple"
            changePct={null}
          />
          <KpiCard
            label="Taxable items"
            value={count(kpis.taxable)}
            icon={BadgePercent}
            accent="orange"
            changePct={null}
          />
        </div>
      )}

      <Panel padded={false}>
        <PanelHeader
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
        <PanelBody className="p-0 sm:p-0">
          <DataTable
            columns={columns}
            rows={products}
            getRowId={(r) => r.id}
            loading={isLoading}
            searchable={false}
            exportFileName="accounts-products"
            emptyTitle="No products match your search"
            emptyDescription="Add billable products and services to use on invoices."
            initialSort={{ id: "name", dir: "asc" }}
          />
        </PanelBody>
      </Panel>

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
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <Input
            label="Category"
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
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
              onChange={(e) =>
                setForm((f) => ({ ...f, taxable: e.target.checked }))
              }
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
              onChange={(e) =>
                setForm((f) => ({ ...f, taxPercentage: e.target.value }))
              }
            />
          ) : null}
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
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
