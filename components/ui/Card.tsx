export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-card transition-shadow duration-200 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const hasText = Boolean(title || description);
  return (
    <div
      className={`flex flex-col gap-1 border-b border-slate-100 px-6 ${
        hasText
          ? "py-5 sm:flex-row sm:items-center sm:justify-between"
          : "items-center justify-center py-3 sm:flex-row"
      }`}
    >
      {hasText ? (
        <div>
          {title ? (
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          ) : null}
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
      ) : null}
      {action ? (
        <div className={hasText ? "mt-4 shrink-0 sm:mt-0" : "shrink-0"}>{action}</div>
      ) : null}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}
