"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import {
  Search,
  Upload,
  FolderPlus,
  FolderInput,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Folder,
  ChevronRight as CrumbSep,
  Home,
  Move,
  Download,
  Trash2,
} from "lucide-react";
import { useSession } from "@/lib/session-context";
import {
  assetsListQueryOptions,
  setAssetsListCache,
  fetchAssets,
  fetchFolders,
  fetchFolderPath,
  createFolder,
  renameFolder,
  deleteFolder,
  moveAssets,
  downloadFolderZip,
  downloadAssetsZip,
  bulkDeleteAssets,
  fetchAssetFile,
  triggerBlobDownload,
  MARKETING_ASSET_TYPES,
  type Asset,
  type AssetCategory,
  type AssetFolder,
} from "@/lib/queries/assets";
import { queryKeys } from "@/lib/query-keys";
import { fetchLocationOptions, locationOptionsQueryKey } from "@/lib/queries/locations";
import {
  collectFilesFromDataTransfer,
  dataTransferHasFiles,
  dropLooksLikeFolder,
} from "@/lib/fs-drop";
import { AssetCard, type AssetBadge } from "@/components/assets/AssetCard";
import { FolderCard } from "@/components/assets/FolderCard";
import { AssetUploadModal } from "@/components/assets/AssetUploadModal";
import { AssetsPageSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/Input";

type VisibilityFilter = "all" | "global" | "location";

const PAGE_SIZE = 24;
const INTERNAL_DRAG_TYPE = "application/x-moka-asset-ids";

interface Props {
  category: AssetCategory;
  title: string;
  adminDescription: string;
  partnerDescription: string;
  showTypeFilter?: boolean;
}

export function AssetLibrary({
  category,
  title,
  adminDescription,
  partnerDescription,
  showTypeFilter = false,
}: Props) {
  const { user, location } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [folderId, setFolderId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFolderMode, setUploadFolderMode] = useState(false);
  const [uploadInitialFiles, setUploadInitialFiles] = useState<File[] | undefined>();
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null | undefined>(
    undefined,
  );
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderBusy, setFolderBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMove, setShowMove] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [folderDropId, setFolderDropId] = useState<string | null>(null);

  const canAccess = user.role === "admin" || user.role === "partner";
  const isAdmin = user.role === "admin";
  const searching = Boolean(search.trim());

  useEffect(() => {
    if (!canAccess) router.replace("/dashboard");
  }, [canAccess, router]);

  const assetsQuery = useQuery({
    queryKey: searching
      ? [...queryKeys.assets.lists(), category, "search"]
      : assetsListQueryOptions(category, folderId).queryKey,
    queryFn: () =>
      searching
        ? fetchAssets(category, { allFolders: true })
        : fetchAssets(category, { folderId }),
    enabled: canAccess,
  });

  const foldersQuery = useQuery({
    queryKey: searching
      ? [...queryKeys.assets.all, "folders", category, "search"]
      : queryKeys.assets.folders(category, folderId),
    queryFn: () =>
      searching
        ? fetchFolders(category, null, { allFolders: true })
        : fetchFolders(category, folderId),
    enabled: canAccess,
  });

  const pathQuery = useQuery({
    queryKey: folderId
      ? queryKeys.assets.folderPath(category, folderId)
      : ["assets", "folder-path", category, "root"],
    queryFn: () => (folderId ? fetchFolderPath(category, folderId) : Promise.resolve([])),
    enabled: canAccess && Boolean(folderId),
  });

  const locsQuery = useQuery({
    queryKey: locationOptionsQueryKey,
    queryFn: fetchLocationOptions,
    enabled: canAccess && isAdmin,
  });

  const assets = assetsQuery.data ?? [];
  const folders = foldersQuery.data ?? [];
  const breadcrumbs = folderId ? pathQuery.data ?? [] : [];
  const loading = assetsQuery.isLoading || foldersQuery.isLoading;

  const locationMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of locsQuery.data ?? []) map[l.id] = l.name;
    return map;
  }, [locsQuery.data]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search, visibilityFilter, locationFilter, typeFilter, folderId]);

  // Keep OS drops from opening the file in a new browser tab when they miss a target.
  useEffect(() => {
    if (!isAdmin) return;
    const blockBrowserOpen = (e: DragEvent) => {
      if (!e.dataTransfer?.types) return;
      if (!Array.from(e.dataTransfer.types).includes("Files")) return;
      e.preventDefault();
    };
    window.addEventListener("dragover", blockBrowserOpen);
    window.addEventListener("drop", blockBrowserOpen);
    return () => {
      window.removeEventListener("dragover", blockBrowserOpen);
      window.removeEventListener("drop", blockBrowserOpen);
    };
  }, [isAdmin]);

  function invalidateLibrary() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
  }

  function handleDeleted(id: string) {
    setAssetsListCache(queryClient, category, (prev) => prev.filter((a) => a.id !== id), folderId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function handleAssetUpdated(updated: Asset) {
    setAssetsListCache(
      queryClient,
      category,
      (prev) => prev.map((a) => (a.id === updated.id ? updated : a)),
      folderId,
    );
  }

  function handleUploaded(asset: Asset) {
    const target = uploadTargetFolderId !== undefined ? uploadTargetFolderId : folderId;
    if (!searching && (asset.folderId ?? null) === target) {
      setAssetsListCache(queryClient, category, (prev) => [asset, ...prev], folderId);
    }
    invalidateLibrary();
  }

  function resolveLocationName(lid: string): string {
    if (isAdmin) return locationMap[lid] ?? lid;
    return location?.name ?? lid;
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    setFolderBusy(true);
    try {
      await createFolder(category, { name, parentId: folderId });
      setShowNewFolder(false);
      setNewFolderName("");
      invalidateLibrary();
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not create folder",
        text: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setFolderBusy(false);
    }
  }

  async function handleRenameFolder(folder: AssetFolder) {
    const { value } = await Swal.fire({
      title: "Rename folder",
      input: "text",
      inputValue: folder.name,
      showCancelButton: true,
      confirmButtonText: "Save",
      inputValidator: (v) => (!v?.trim() ? "Name is required" : null),
    });
    if (!value?.trim()) return;
    try {
      await renameFolder(category, folder.id, value.trim());
      invalidateLibrary();
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not rename",
        text: e instanceof Error ? e.message : "Please try again.",
      });
    }
  }

  async function handleDeleteFolder(folder: AssetFolder) {
    const first = await deleteFolder(category, folder.id, false);
    const nonempty =
      !first.ok &&
      (first.code === "FOLDER_NOT_EMPTY" ||
        (first.assetCount ?? 0) > 0 ||
        (first.subfolderCount ?? 0) > 0 ||
        /contains/i.test(first.message ?? ""));

    if (nonempty) {
      const conf = await Swal.fire({
        title: "Delete this folder?",
        html: `<p>This folder contains <strong>${first.assetCount ?? 0}</strong> file(s) and <strong>${first.subfolderCount ?? 0}</strong> subfolder(s).</p><p class="mt-2 text-sm text-slate-600">The folder and every file inside it will be deleted.</p>`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete folder and files",
        confirmButtonColor: "#dc2626",
      });
      if (!conf.isConfirmed) return;
      const forced = await deleteFolder(category, folder.id, true);
      if (!forced.ok) {
        void Swal.fire({ icon: "error", title: "Could not delete", text: forced.message });
        return;
      }
    } else if (!first.ok) {
      void Swal.fire({ icon: "error", title: "Could not delete", text: first.message });
      return;
    }
    invalidateLibrary();
  }

  async function handleDownloadFolder(folder: AssetFolder) {
    try {
      await downloadFolderZip(category, folder.id);
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not download folder",
        text: e instanceof Error ? e.message : "Please try again.",
      });
    }
  }

  async function handleBulkDownload() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      if (ids.length === 1) {
        const asset = assets.find((a) => a.id === ids[0]);
        const { blob, filename } = await fetchAssetFile(
          ids[0],
          category,
          undefined,
          asset?.originalFileName || asset?.name,
          { download: true },
        );
        triggerBlobDownload(blob, filename);
      } else {
        await downloadAssetsZip(category, ids);
      }
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not download",
        text: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const conf = await Swal.fire({
      title: ids.length === 1 ? "Delete this file?" : `Delete ${ids.length} files?`,
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!conf.isConfirmed) return;
    setBulkBusy(true);
    try {
      await bulkDeleteAssets(category, ids);
      setSelectedIds(new Set());
      invalidateLibrary();
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not delete",
        text: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleMoveSelected() {
    if (!selectedIds.size) return;
    setFolderBusy(true);
    try {
      await moveAssets(category, {
        assetIds: [...selectedIds],
        folderId: moveTarget,
      });
      setShowMove(false);
      setSelectedIds(new Set());
      invalidateLibrary();
      void Swal.fire({
        icon: "success",
        title: "Moved",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not move",
        text: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setFolderBusy(false);
    }
  }

  async function moveIdsToFolder(assetIds: string[], targetFolderId: string) {
    if (!assetIds.length) return;
    try {
      await moveAssets(category, { assetIds, folderId: targetFolderId });
      setSelectedIds(new Set());
      invalidateLibrary();
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Could not move",
        text: e instanceof Error ? e.message : "Please try again.",
      });
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openUpload(opts?: {
    folderMode?: boolean;
    files?: File[];
    intoFolderId?: string | null;
  }) {
    setUploadFolderMode(Boolean(opts?.folderMode));
    setUploadInitialFiles(opts?.files);
    setUploadTargetFolderId(opts?.intoFolderId !== undefined ? opts.intoFolderId : undefined);
    setShowUpload(true);
  }

  function closeUpload() {
    setShowUpload(false);
    setUploadInitialFiles(undefined);
    setUploadTargetFolderId(undefined);
    setUploadFolderMode(false);
  }

  function isInternalAssetDrag(dt: DataTransfer) {
    return Array.from(dt.types).includes(INTERNAL_DRAG_TYPE);
  }

  function allowOsFileDrag(e: React.DragEvent) {
    if (!isAdmin || !dataTransferHasFiles(e.dataTransfer)) return false;
    if (isInternalAssetDrag(e.dataTransfer)) return false;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    return true;
  }

  async function handleOsDrop(
    e: React.DragEvent,
    intoFolderId: string | null = folderId,
  ) {
    if (!isAdmin) return;
    // Snapshot during the drop event — entries go stale if deferred.
    const dt = e.dataTransfer;
    if (!dataTransferHasFiles(dt) || isInternalAssetDrag(dt)) return;

    e.preventDefault();
    e.stopPropagation();
    setFolderDropId(null);

    const files = await collectFilesFromDataTransfer(dt);
    if (!files.length) return;
    openUpload({
      folderMode: dropLooksLikeFolder(files),
      files,
      intoFolderId,
    });
  }

  if (!canAccess) return null;

  const locationOptions = isAdmin
    ? Array.from(
        new Set(assets.filter((a) => a.visibility === "location").flatMap((a) => a.locationIds)),
      ).map((lid) => ({ id: lid, name: resolveLocationName(lid) }))
    : [];

  const filtered = assets.filter((a) => {
    const displayName = a.name || a.originalFileName || a.originalName;
    if (search.trim() && !displayName.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    if (visibilityFilter !== "all" && a.visibility !== visibilityFilter) return false;
    if (isAdmin && visibilityFilter === "location" && locationFilter !== "all") {
      if (!a.locationIds.includes(locationFilter)) return false;
    }
    if (showTypeFilter && typeFilter !== "all" && (a.type ?? "other") !== typeFilter) return false;
    return true;
  });

  const filteredFolders = folders.filter((f) => {
    if (!search.trim()) return true;
    return f.name.toLowerCase().includes(search.trim().toLowerCase());
  });

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (visibilityFilter !== "all" ? 1 : 0) +
    (locationFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function clearFilters() {
    setSearch("");
    setVisibilityFilter("all");
    setLocationFilter("all");
    setTypeFilter("all");
  }

  function badgesFor(asset: Asset): AssetBadge[] {
    const badges: AssetBadge[] = [];
    if (asset.visibility === "global") {
      badges.push({ label: "General", tone: "slate" });
    } else if (isAdmin) {
      const names = asset.locationIds.map((lid) => resolveLocationName(lid));
      badges.push({
        label: names.length > 1 ? `${names[0]} +${names.length - 1}` : (names[0] ?? "Location"),
        tone: "primary",
        details: names,
      });
    } else {
      badges.push({ label: "Specific To You", tone: "primary" });
    }
    if (showTypeFilter && asset.type) {
      const label = MARKETING_ASSET_TYPES.find((t) => t.value === asset.type)?.label ?? asset.type;
      badges.push({ label, tone: "blue" });
    }
    return badges;
  }

  function locationContextFor(asset: Asset): string | undefined {
    if (asset.visibility !== "location") return undefined;
    if (isAdmin && locationFilter !== "all") return locationFilter;
    if (asset.locationIds.length === 1) return asset.locationIds[0];
    return undefined;
  }

  const effectiveUploadFolderId =
    uploadTargetFolderId !== undefined ? uploadTargetFolderId : folderId;

  return (
    <div
      className="relative p-6"
      onDragOver={(e) => {
        allowOsFileDrag(e);
      }}
      onDrop={(e) => void handleOsDrop(e, folderId)}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {isAdmin ? adminDescription : partnerDescription}
          </p>
        </div>
        {isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setShowNewFolder(true)}>
              <FolderPlus className="mr-2 h-4 w-4" /> New folder
            </Button>
            <Button variant="secondary" onClick={() => openUpload({ folderMode: true })}>
              <FolderInput className="mr-2 h-4 w-4" /> Upload folder
            </Button>
            <Button onClick={() => openUpload({ folderMode: false })}>
              <Upload className="mr-2 h-4 w-4" /> Upload files
            </Button>
          </div>
        ) : null}
      </div>

      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-600">
        <button
          type="button"
          onClick={() => setFolderId(null)}
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-100 ${
            !folderId ? "font-semibold text-slate-900" : ""
          }`}
        >
          <Home className="h-3.5 w-3.5" /> Home
        </button>
        {breadcrumbs.map((crumb) => (
          <span key={crumb.id} className="inline-flex items-center gap-1">
            <CrumbSep className="h-3.5 w-3.5 text-slate-300" />
            <button
              type="button"
              onClick={() => setFolderId(crumb.id)}
              className={`rounded-lg px-2 py-1 hover:bg-slate-100 ${
                crumb.id === folderId ? "font-semibold text-slate-900" : ""
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </nav>

      {loading ? (
        <AssetsPageSkeleton variant={category} />
      ) : (
        <>
          <div className="sticky top-16 z-10 mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-card">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search all files…"
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none ring-primary-200 placeholder:text-slate-400 focus:border-primary-300 focus:ring-4"
              />
            </div>

            <Select
              value={visibilityFilter}
              onChange={(e) => {
                setVisibilityFilter(e.target.value as VisibilityFilter);
                setLocationFilter("all");
              }}
              className="w-auto"
            >
              <option value="all">All Visibility</option>
              <option value="global">General Only</option>
              <option value="location">
                {isAdmin ? "Location-Specific Only" : "Specific To You"}
              </option>
            </Select>

            {isAdmin && visibilityFilter === "location" && locationOptions.length > 0 && (
              <Select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-auto"
              >
                <option value="all">All Locations</option>
                {locationOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            )}

            {showTypeFilter && (
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-auto"
              >
                <option value="all">All Types</option>
                {MARKETING_ASSET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            )}

            {isAdmin && selectedIds.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={bulkBusy}
                  onClick={() => void handleBulkDownload()}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowMove(true)}
                >
                  <Move className="mr-1.5 h-3.5 w-3.5" />
                  Move ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={bulkBusy}
                  onClick={() => void handleBulkDelete()}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete ({selectedIds.size})
                </Button>
              </div>
            ) : null}

            <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {filteredFolders.length} folders · {filtered.length} files
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 font-medium text-primary-800 ring-1 ring-inset ring-primary-200/80 hover:bg-primary-100"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          </div>

          {searching ? (
            <p className="mb-3 text-xs text-slate-500">
              Showing matching folders and files across all folders.
            </p>
          ) : null}

          {filteredFolders.length === 0 && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Folder className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm">
                {assets.length === 0 && folders.length === 0
                  ? "This folder is empty."
                  : "No files or folders match your filters."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredFolders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    isAdmin={isAdmin}
                    dropActive={folderDropId === folder.id}
                    onOpen={() => {
                      setSearch("");
                      setFolderId(folder.id);
                    }}
                    onRename={() => void handleRenameFolder(folder)}
                    onDelete={() => void handleDeleteFolder(folder)}
                    onDownload={() => void handleDownloadFolder(folder)}
                    onDragOver={(e) => {
                      const internal = isInternalAssetDrag(e.dataTransfer);
                      const files = dataTransferHasFiles(e.dataTransfer);
                      if (!internal && !files) return;
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = internal ? "move" : "copy";
                      setFolderDropId(folder.id);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      setFolderDropId((id) => (id === folder.id ? null : id));
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFolderDropId(null);

                      const raw = e.dataTransfer.getData(INTERNAL_DRAG_TYPE);
                      if (raw && isAdmin) {
                        try {
                          const ids = JSON.parse(raw) as string[];
                          void moveIdsToFolder(ids, folder.id);
                        } catch {
                          /* ignore */
                        }
                        return;
                      }

                      if (isAdmin && dataTransferHasFiles(e.dataTransfer)) {
                        void handleOsDrop(e, folder.id);
                      }
                    }}
                  />
                ))}

                {paginated.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    role={user.role}
                    onDeleted={handleDeleted}
                    onUpdated={handleAssetUpdated}
                    locationContext={locationContextFor(asset)}
                    badges={badgesFor(asset)}
                    selected={isAdmin && selectedIds.has(asset.id)}
                    onSelect={isAdmin ? () => toggleSelect(asset.id) : undefined}
                    draggable={isAdmin}
                    onDragStart={(e) => {
                      const ids = selectedIds.has(asset.id) ? [...selectedIds] : [asset.id];
                      if (!selectedIds.has(asset.id)) {
                        setSelectedIds(new Set([asset.id]));
                      }
                      e.dataTransfer.setData(INTERNAL_DRAG_TYPE, JSON.stringify(ids));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setFolderDropId(null)}
                  />
                ))}
              </div>

              {pageCount > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-slate-500">
                    Page {currentPage} of {pageCount}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={currentPage >= pageCount}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showUpload && (
        <AssetUploadModal
          category={category}
          folderId={effectiveUploadFolderId}
          folderMode={uploadFolderMode}
          initialFiles={uploadInitialFiles}
          onUploaded={handleUploaded}
          onClose={closeUpload}
        />
      )}

      <Modal
        open={showNewFolder}
        title="New folder"
        onClose={() => !folderBusy && setShowNewFolder(false)}
      >
        <div className="space-y-4">
          <Input
            label="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="e.g. Fall Drinks"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowNewFolder(false)} disabled={folderBusy}>
              Cancel
            </Button>
            <Button
              disabled={!newFolderName.trim() || folderBusy}
              onClick={() => void handleCreateFolder()}
            >
              {folderBusy ? "Creating…" : "Create folder"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showMove}
        title={`Move ${selectedIds.size} item(s)`}
        onClose={() => !folderBusy && setShowMove(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Choose a destination. Files stay in Cloudflare R2 — only the folder link changes.
          </p>
          <Select
            label="Destination"
            value={moveTarget ?? ""}
            onChange={(e) => setMoveTarget(e.target.value || null)}
          >
            <option value="">Home (root)</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} (current folder)
              </option>
            ))}
            {breadcrumbs.map((f) => (
              <option key={`bc-${f.id}`} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
          <p className="text-xs text-slate-500">
            Tip: drag files onto a folder card, or open the destination folder first.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowMove(false)} disabled={folderBusy}>
              Cancel
            </Button>
            <Button disabled={folderBusy} onClick={() => void handleMoveSelected()}>
              {folderBusy ? "Moving…" : "Move here"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
