/** Adobe Photoshop's real app-icon colors — recognizable at a glance, no preview needed. */
export function PhotoshopLogo({
  className = "h-16 w-16",
  textClassName = "text-xl",
}: {
  className?: string;
  textClassName?: string;
}) {
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#001E36] to-[#1476C9] shadow-sm`}
    >
      <span className={`${textClassName} font-bold tracking-tight text-[#31C5F0]`}>
        Ps
      </span>
    </div>
  );
}
