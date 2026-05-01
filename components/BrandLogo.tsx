import Image from "next/image";

const BRAND_LOGO_SRC =
  "https://mokanco.com/wp-content/uploads/2026/03/Group-121.png";

const COFFEE_FILTER =
  "brightness(0) saturate(100%) invert(22%) sepia(42%) saturate(834%) hue-rotate(346deg) brightness(96%) contrast(92%)";

export function BrandLogo({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "white" | "coffee";
}) {
  const style =
    variant === "white"
      ? { filter: "brightness(0) invert(1)" }
      : variant === "coffee"
        ? { filter: COFFEE_FILTER }
        : undefined;

  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt="Mokanco"
      width={256}
      height={256}
      priority
      className={`object-contain ${className}`}
      style={style}
    />
  );
}

