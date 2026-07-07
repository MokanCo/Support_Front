"use client";

import { Check, Circle } from "lucide-react";

export type OnboardingPublicTask = {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  publicComment: string;
};

export type OnboardingPublicService = {
  slug: string;
  title: string;
  section?: string;
  sortOrder?: number;
  tasks: OnboardingPublicTask[];
};

export type OnboardingServiceSection = {
  title: string;
  services: OnboardingPublicService[];
};

function PublicServiceCard({ svc }: { svc: OnboardingPublicService }) {
  const done = svc.tasks.filter((t) => t.completed).length;
  const total = svc.tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = done === total && total > 0;

  return (
    <div
      className={`overflow-hidden rounded-xl border transition-shadow ${
        allDone ? "border-emerald-200/80 bg-emerald-50/30" : "border-slate-200/80 bg-white"
      }`}
    >
      <div
        className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${
          allDone
            ? "border-emerald-100 bg-emerald-50/50"
            : "border-slate-100 bg-gradient-to-r from-slate-50/80 to-white"
        }`}
      >
        <h3 className="font-semibold text-slate-900">{svc.title}</h3>
        <span className="text-xs font-semibold text-slate-500">
          {done}/{total}
        </span>
      </div>
      {total > 0 && (
        <div className="px-4 pt-2">
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
      <ul className="divide-y divide-slate-100">
        {svc.tasks.map((task) => (
          <li key={task.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              {task.completed ? (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </span>
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Circle className="h-3 w-3 fill-current" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium leading-snug ${
                    task.completed ? "text-slate-600" : "text-slate-900"
                  }`}
                >
                  {task.title}
                </p>
                {task.publicComment && (
                  <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs leading-relaxed text-slate-600">
                    <span className="font-semibold text-primary-700">Update: </span>
                    {task.publicComment}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function groupServicesBySection(
  services: OnboardingPublicService[],
): OnboardingServiceSection[] {
  const order = ["Business Listings", "Website Listing", "Geo Tagging Listing", "Third Party", "Delivery Services", "Other"];
  const map = new Map<string, OnboardingPublicService[]>();
  for (const svc of services) {
    const key = svc.section || "Other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(svc);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })
    .map(([title, sectionServices]) => ({
      title,
      services: [...sectionServices].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    }));
}

export function resolveServiceSections(
  serviceSections: OnboardingServiceSection[] | undefined,
  services: OnboardingPublicService[],
): OnboardingServiceSection[] {
  if (serviceSections && serviceSections.length > 0) return serviceSections;
  if (services.length === 0) return [];
  return groupServicesBySection(services);
}

export function OnboardingPublicServiceSections({
  serviceSections,
  services,
  preview = false,
}: {
  serviceSections?: OnboardingServiceSection[];
  services: OnboardingPublicService[];
  preview?: boolean;
}) {
  const sections = resolveServiceSections(serviceSections, services);
  if (sections.length === 0) return null;

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title} className="space-y-3">
          <div className="flex items-center gap-2 px-0.5">
            <span className="h-2 w-2 rounded-full bg-primary-500" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary-800">
              {section.title}
            </h3>
            {preview && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                Preview
              </span>
            )}
          </div>
          <div className="space-y-3">
            {section.services.map((svc) => (
              <PublicServiceCard key={svc.slug} svc={svc} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
