"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronLeft,
  Cpu,
  CreditCard,
  MapPin,
  Menu,
  MonitorSmartphone,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { resolveApiUrl } from "@/lib/api-base";

/** Decorative coffee photography (Unsplash — hotlink allowed for demo; swap for CDN assets if needed). */
const COFFEE_SIDE_IMAGES = [
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1000&q=85",
] as const;

const SERVICE_OPTIONS = [
  {
    id: "local_listings",
    title: "Google, Yelp & Apple listings",
    subtitle: "Directory registration and verification.",
    icon: MapPin,
  },
  {
    id: "toast",
    title: "Toast POS registration",
    subtitle: "Account setup and configuration.",
    icon: UtensilsCrossed,
  },
  {
    id: "hardware",
    title: "Hardware & devices",
    subtitle: "Terminals, printers, and kitchen displays.",
    icon: Cpu,
  },
  {
    id: "third_party_ordering",
    title: "Third-party ordering",
    subtitle: "Marketplace and aggregator integrations.",
    icon: ShoppingBag,
  },
  {
    id: "appfront_loyalty",
    title: "Appfront & loyalty",
    subtitle: "Branded apps and loyalty programs.",
    icon: MonitorSmartphone,
  },
  {
    id: "payment_processing",
    title: "Payment processing",
    subtitle: "Readers, gateways, and settlement.",
    icon: CreditCard,
  },
  {
    id: "menu_training",
    title: "Menu build & training",
    subtitle: "Menu structure, content, and staff training.",
    icon: Menu,
  },
] as const;

type Basics = {
  firstName: string;
  lastName: string;
  email: string;
  locationName: string;
  locationAddress: string;
  locationPhone: string;
  notes: string;
};

const emptyBasics: Basics = {
  firstName: "",
  lastName: "",
  email: "",
  locationName: "",
  locationAddress: "",
  locationPhone: "",
  notes: "",
};

function formatOnboardingMessage(basics: Basics, serviceIds: Set<string>) {
  const lines = [
    "[NEW LOCATION ONBOARDING REQUEST]",
    "",
    "— Contact —",
    `Name: ${basics.firstName} ${basics.lastName}`.trim(),
    `Personal email: ${basics.email}`,
    "",
    "— Location —",
    `Location name: ${basics.locationName}`,
    `Address: ${basics.locationAddress}`,
    `Phone: ${basics.locationPhone}`,
    ...(basics.notes.trim() ? [`Notes: ${basics.notes.trim()}`] : []),
    "",
    "— Services requested —",
    ...SERVICE_OPTIONS.filter((s) => serviceIds.has(s.id)).map((s) => `• ${s.title}`),
  ];
  if (serviceIds.size === 0) lines.push("(none selected)");
  return lines.join("\n");
}

type WizardStep = "details" | "services" | "review" | "success";

const PROGRESS_LABELS = ["Details", "Services", "Review"] as const;

function wizardStepIndex(s: WizardStep): number {
  if (s === "details") return 0;
  if (s === "services") return 1;
  if (s === "review") return 2;
  return -1;
}

type OnboardingWelcomeModalProps = {
  onStart: () => void;
  onClose: () => void;
};

/** Light overlay — keeps the login page body visually unchanged aside from a faint dim. */
export function OnboardingWelcomeModal({ onStart, onClose }: OnboardingWelcomeModalProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onb-welcome-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/[0.12] backdrop-blur-[2px]"
        aria-label="Close welcome dialog"
        onClick={onClose}
      />
      <div className="relative z-[1] w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.2)] sm:p-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
          Moka &amp; Co
        </p>
        <h2
          id="onb-welcome-title"
          className="mt-3 text-center text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
        >
          New location onboarding
        </h2>
        <p className="mt-4 text-center text-sm leading-relaxed text-slate-600 sm:text-base">
          We welcome you to the Mokanco family. A few quick steps capture your details and the
          services you need — then our team takes it from there.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" variant="secondary" className="sm:min-w-[7rem]" onClick={onClose}>
            Not now
          </Button>
          <Button type="button" className="sm:min-w-[11rem]" onClick={onStart}>
            Start onboarding
          </Button>
        </div>
      </div>
    </div>
  );
}

type OnboardingWizardPanelProps = {
  onClose: () => void;
};

function OnboardingWizardPanel({ onClose }: OnboardingWizardPanelProps) {
  const [step, setStep] = useState<WizardStep>("details");
  const [basics, setBasics] = useState<Basics>(emptyBasics);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const toggleService = useCallback((id: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const basicsValid =
    basics.firstName.trim() &&
    basics.lastName.trim() &&
    basics.email.trim() &&
    basics.locationName.trim() &&
    basics.locationAddress.trim() &&
    basics.locationPhone.trim();

  const canSubmit = basicsValid && selectedServices.size > 0;

  const wIdx = wizardStepIndex(step);
  const progressPercent = useMemo(() => {
    if (wIdx < 0) return 0;
    return ((wIdx + 1) / PROGRESS_LABELS.length) * 100;
  }, [wIdx]);

  const stepTagline = useMemo(() => {
    if (step === "details") return "Identity & location — the foundation for your rollout.";
    if (step === "services") return "Choose every capability you want us to stand up with you.";
    if (step === "review") return "One last look, then we route this straight to the team.";
    return "";
  }, [step]);

  function goBack() {
    setSubmitError(null);
    if (step === "details") onClose();
    else if (step === "services") setStep("details");
    else if (step === "review") setStep("services");
  }

  function goNext() {
    setSubmitError(null);
    if (step === "details" && basicsValid) setStep("services");
    else if (step === "services" && selectedServices.size > 0) setStep("review");
  }

  async function submitRequest() {
    if (!canSubmit) return;
    setSubmitError(null);
    setLoading(true);
    const fullName = `${basics.firstName} ${basics.lastName}`.trim();
    const message = formatOnboardingMessage(basics, selectedServices);
    try {
      const res = await fetch(resolveApiUrl("/api/messages/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          name: fullName,
          email: basics.email.trim(),
          message,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSubmitError(data.error ?? "Could not submit. Please try again.");
        return;
      }
      setStep("success");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const titleId = "onb-dialog-title";

  return (
    <div
      className="flex max-h-[min(720px,calc(100dvh-3rem))] w-full max-w-xl flex-col overflow-hidden rounded-[3px] border border-slate-200/90 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.18)] backdrop-blur lg:max-h-[min(560px,calc(100dvh-3rem))] lg:h-full"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="h-1 shrink-0 bg-gradient-to-r from-primary-900 via-primary-600 to-amber-500"
        aria-hidden
      />

      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100/90 bg-gradient-to-b from-slate-50/90 to-white px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-primary-600/25 to-amber-400/20 blur-sm" aria-hidden />
            <div className="relative rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
              <BrandLogo variant="coffee" className="h-9 w-9 sm:h-10 sm:w-10" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 id={titleId} className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                New location onboarding
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary-200/80 bg-primary-50/90 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-primary-900 sm:text-xs">
                <Sparkles className="h-3 w-3 text-primary-600" aria-hidden />
                Moka &amp; Co
              </span>
            </div>
            <p className="mt-1 text-xs leading-snug text-slate-600 sm:text-sm">
              {step === "success" ? "Request received — we will follow up by email." : stepTagline}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 sm:text-sm"
        >
          Back to login
        </button>
      </div>

      {step !== "success" ? (
        <div className="shrink-0 space-y-3 border-b border-slate-100 bg-white px-5 py-3 sm:px-6">
          <div
            className="flex h-1.5 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
            aria-label="Onboarding progress"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-700 to-amber-500 transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            {PROGRESS_LABELS.map((label, i) => {
              const active = i === wIdx;
              const done = i < wIdx;
              return (
                <div
                  key={label}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition sm:flex-row sm:justify-center sm:gap-2 sm:px-2 ${
                    active
                      ? "bg-primary-50/90 shadow-sm ring-1 ring-primary-200/60"
                      : done
                        ? "opacity-90"
                        : "opacity-60"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-9 sm:w-9 sm:text-sm ${
                      done
                        ? "bg-primary-700 text-white shadow-md shadow-primary-900/15"
                        : active
                          ? "bg-white text-primary-800 ring-2 ring-primary-500/40"
                          : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                    }`}
                    aria-current={active ? "step" : undefined}
                  >
                    {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
                  </div>
                  <span
                    className={`max-w-[5.5rem] truncate text-[0.65rem] font-semibold sm:max-w-none sm:text-xs ${
                      active ? "text-primary-950" : "text-slate-600"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50/40 px-5 py-5 sm:px-6 sm:py-6">
        <div key={step} className="onb-step-enter">
          {step === "details" ? (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-slate-900">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-700 text-white shadow-md shadow-primary-900/20">
                  <Building2 className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Your details</h2>
                  <p className="text-xs text-slate-500 sm:text-sm">Step 1 of 3</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Enter the information we need to identify you and your new location.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="First name"
                  name="firstName"
                  value={basics.firstName}
                  onChange={(e) => setBasics((b) => ({ ...b, firstName: e.target.value }))}
                  autoComplete="given-name"
                  required
                />
                <Input
                  label="Last name"
                  name="lastName"
                  value={basics.lastName}
                  onChange={(e) => setBasics((b) => ({ ...b, lastName: e.target.value }))}
                  autoComplete="family-name"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Personal email"
                  name="email"
                  type="email"
                  value={basics.email}
                  onChange={(e) => setBasics((b) => ({ ...b, email: e.target.value }))}
                  autoComplete="email"
                  required
                />
                <Input
                  label="Location phone"
                  name="locationPhone"
                  type="tel"
                  value={basics.locationPhone}
                  onChange={(e) => setBasics((b) => ({ ...b, locationPhone: e.target.value }))}
                  autoComplete="tel"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Location name"
                  name="locationName"
                  value={basics.locationName}
                  onChange={(e) => setBasics((b) => ({ ...b, locationName: e.target.value }))}
                  required
                />
                <Input
                  label="Notes (optional)"
                  name="notes"
                  value={basics.notes}
                  onChange={(e) => setBasics((b) => ({ ...b, notes: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Textarea
                    label="Location address"
                    name="locationAddress"
                    rows={3}
                    value={basics.locationAddress}
                    onChange={(e) => setBasics((b) => ({ ...b, locationAddress: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === "services" ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Services required</h2>
                <p className="text-xs text-slate-500 sm:text-sm">Step 2 of 3</p>
              </div>
              <p className="text-sm text-slate-600">
                Select every service you need for this location. You may choose more than one.
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {SERVICE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = selectedServices.has(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleService(opt.id)}
                      aria-pressed={selected}
                      className={`group flex gap-3 rounded-xl border p-4 text-left shadow-sm transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 motion-reduce:transform-none ${
                        selected
                          ? "border-primary-500 bg-gradient-to-br from-primary-50 to-amber-50/50 ring-2 ring-primary-500/25"
                          : "border-slate-200/90 bg-white hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                      }`}
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
                          selected
                            ? "bg-primary-700 text-white shadow-inner"
                            : "bg-slate-100 text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-800"
                        }`}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-900">{opt.title}</span>
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                              selected
                                ? "border-primary-800 bg-primary-700 text-white"
                                : "border-slate-300 bg-white group-hover:border-primary-300"
                            }`}
                          >
                            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                          </span>
                        </span>
                        <span className="mt-1 block text-sm text-slate-600">{opt.subtitle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === "review" ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Review and submit</h2>
                <p className="text-xs text-slate-500 sm:text-sm">Step 3 of 3</p>
              </div>
              <p className="text-sm text-slate-600">
                Confirm the information below. You can go back to make changes before submitting.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contact &amp; location
                  </h3>
                  <dl className="mt-3 space-y-2 text-sm text-slate-700">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Name</dt>
                      <dd>
                        {basics.firstName} {basics.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Email</dt>
                      <dd className="break-all">{basics.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Location</dt>
                      <dd>{basics.locationName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Phone</dt>
                      <dd>{basics.locationPhone}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Address</dt>
                      <dd className="whitespace-pre-wrap">{basics.locationAddress}</dd>
                    </div>
                    {basics.notes.trim() ? (
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Notes</dt>
                        <dd className="whitespace-pre-wrap">{basics.notes.trim()}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Services</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-800">
                    {SERVICE_OPTIONS.filter((s) => selectedServices.has(s.id)).map((s) => (
                      <li key={s.id} className="flex gap-2">
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary-700"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                        <span>{s.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
            </div>
          ) : null}

          {step === "success" ? (
            <div className="mx-auto max-w-md space-y-5 py-4 text-center">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/30 to-primary-400/20 blur-md"
                  aria-hidden
                />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-primary-700 text-white shadow-lg shadow-primary-900/25 ring-2 ring-white">
                  <Check className="h-8 w-8" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Request submitted
              </h2>
              <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                Your onboarding request has been submitted. Once approved, an email will be sent to
                you where you can track your onboarding process.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
        {step === "success" ? (
          <Button type="button" className="ml-auto w-full sm:w-auto" onClick={onClose}>
            Return to sign in
          </Button>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={goBack} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" aria-hidden />
              {step === "details" ? "Cancel" : "Back"}
            </Button>
            <div className="ml-auto flex gap-2">
              {step === "review" ? (
                <Button
                  type="button"
                  disabled={!canSubmit || loading}
                  onClick={() => void submitRequest()}
                >
                  {loading ? "Submitting…" : "Submit request"}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={
                    (step === "details" && !basicsValid) ||
                    (step === "services" && selectedServices.size === 0)
                  }
                >
                  Next
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes onbStepEnter {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .onb-step-enter {
          animation: onbStepEnter 0.28s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .onb-step-enter {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

type OnboardingWizardSplitProps = {
  onClose: () => void;
};

/** Left: full-bleed coffee imagery + Mokanco logo. Right: wizard (no full-screen backdrop). */
export function OnboardingWizardSplit({ onClose }: OnboardingWizardSplitProps) {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6 lg:h-[min(560px,calc(100dvh-3rem))] lg:flex-row lg:items-stretch lg:justify-center lg:gap-6">
      <aside className="relative order-2 min-h-[220px] w-full overflow-hidden rounded-[3px] shadow-[0_22px_70px_rgba(74,44,28,0.28)] lg:order-1 lg:min-h-0 lg:max-w-[420px] lg:flex-1">
        <div className="absolute inset-0 grid grid-cols-2">
          <img
            src={COFFEE_SIDE_IMAGES[0]}
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
          <img
            src={COFFEE_SIDE_IMAGES[1]}
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/35" aria-hidden />
        <div className="absolute left-4 top-4 z-20 sm:left-5 sm:top-5">
          <div className="rounded-xl border border-white/25 bg-black/25 p-2 shadow-lg backdrop-blur-md">
            <BrandLogo variant="white" className="h-10 w-10 sm:h-11 sm:w-11" />
          </div>
        </div>
      </aside>

      <section className="order-1 flex min-h-0 w-full min-w-0 justify-center lg:order-2 lg:max-w-xl lg:flex-1 lg:justify-end">
        <OnboardingWizardPanel onClose={onClose} />
      </section>
    </div>
  );
}
