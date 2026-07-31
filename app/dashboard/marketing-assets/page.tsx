"use client";

import { AssetLibrary } from "@/components/assets/AssetLibrary";

export default function MarketingAssetsPage() {
  return (
    <AssetLibrary
      category="marketing_assets"
      title="Marketing Assets"
      adminDescription="Manage marketing images and materials."
      partnerDescription="View and download available marketing assets."
      showTypeFilter
    />
  );
}
