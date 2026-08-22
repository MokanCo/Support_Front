import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const toDir = join(root, "public");
const to = join(toDir, "pdf.worker.min.mjs");

mkdirSync(toDir, { recursive: true });
copyFileSync(from, to);
