"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";

type PdfjsLib = typeof import("pdfjs-dist");

let pdfjsLoader: Promise<PdfjsLib> | null = null;

function loadPdfjs(): Promise<PdfjsLib> {
  if (!pdfjsLoader) {
    pdfjsLoader = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfjs;
    });
  }
  return pdfjsLoader;
}

function formatBytes(n: number) {
  if (!n || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  blob: Blob;
  filename: string;
  fileSize?: number;
}

export function PdfPageViewer({ blob, filename, fileSize = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    async function openPdf() {
      setLoading(true);
      setError(null);
      setPageCount(0);
      setPageNumber(1);

      try {
        const pdfjs = await loadPdfjs();
        if (cancelled) return;

        const typed = blob.type.toLowerCase().includes("pdf")
          ? blob
          : new Blob([blob], { type: "application/pdf" });
        const data = new Uint8Array(await typed.arrayBuffer());
        if (cancelled) return;

        loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;
        if (cancelled) {
          void pdf.destroy();
          return;
        }
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not open this PDF.",
        );
        setLoading(false);
      }
    }

    void openPdf();

    return () => {
      cancelled = true;
      pdfRef.current?.destroy().catch(() => undefined);
      pdfRef.current = null;
      void loadingTask?.destroy().catch(() => undefined);
    };
  }, [blob]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (loading || !pdf || !canvas || !container || pageCount < 1) return;

    const doc = pdf;
    const canvasEl = canvas;
    const containerEl = container;
    let cancelled = false;
    const renderTaskRef: { cancel?: () => void } = {};

    async function draw() {
      setRendering(true);
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const fit = Math.max(containerEl.clientWidth - 8, 120) / base.width;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scale = fit * zoom * dpr;
        const viewport = page.getViewport({ scale });
        canvasEl.width = Math.floor(viewport.width);
        canvasEl.height = Math.floor(viewport.height);
        canvasEl.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvasEl.style.height = `${Math.floor(viewport.height / dpr)}px`;
        const ctx = canvasEl.getContext("2d");
        if (!ctx) return;
        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.cancel = () => task.cancel();
        await task.promise;
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : "";
        if (name === "RenderingCancelledException") return;
        setError(err instanceof Error ? err.message : "Could not render this page.");
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    void draw();
    return () => {
      cancelled = true;
      renderTaskRef.cancel?.();
    };
  }, [loading, pageCount, pageNumber, zoom]);

  if (error) {
    return (
      <div className="flex min-h-[280px] w-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <p className="text-xs text-slate-500">
          Use Download if the preview cannot open this large file.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[70vh] w-full flex-col">
      {pageCount > 0 ? (
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-slate-600">
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-white disabled:opacity-40"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((n) => Math.max(1, n - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[7rem] text-center text-xs font-medium">
            Page {pageNumber} of {pageCount}
          </span>
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-white disabled:opacity-40"
            disabled={pageNumber >= pageCount}
            onClick={() => setPageNumber((n) => Math.min(pageCount, n + 1))}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-white disabled:opacity-40"
            disabled={zoom <= 0.5}
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-xs">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-white disabled:opacity-40"
            disabled={zoom >= 2.5}
            onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-auto rounded-lg bg-slate-200/80"
      >
        {loading ? (
          <div className="flex min-h-[280px] w-full flex-col items-center justify-center gap-3 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin text-slate-700" aria-hidden />
            <p className="text-sm">Opening PDF…</p>
            {fileSize > 0 ? (
              <p className="text-xs text-slate-500">{formatBytes(fileSize)}</p>
            ) : null}
          </div>
        ) : (
          <div className="flex justify-center p-2">
            <canvas
              ref={canvasRef}
              className="max-w-full bg-white shadow-sm"
              title={filename}
            />
          </div>
        )}
        {rendering && !loading ? (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/90 p-1 shadow">
            <Loader2 className="h-4 w-4 animate-spin text-slate-600" aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  );
}
