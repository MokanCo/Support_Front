"use client";

import { AssetLibrary } from "@/components/assets/AssetLibrary";

export default function DocumentsPage() {
  return (
    <AssetLibrary
      category="documents"
      title="Documents"
      adminDescription="Manage shared documents."
      partnerDescription="View and download available documents."
    />
  );
}
