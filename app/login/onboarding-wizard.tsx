"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  Coffee,
  Facebook,
  Globe,
  Instagram,
  Mail,
  MapPin,
  MonitorSmartphone,
  Smartphone,
  Star,
  User,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import type { AddressSuggestion } from "@/components/ui/address-autocomplete";
import { formatUSPhone } from "@/lib/format";

type ServiceOption = {
  id: string;
  title: string;
  icon: React.ElementType;
  iconClass: string;
};

const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: "google",
    title: "Google",
    icon: Globe,
    iconClass: "bg-blue-100 text-blue-600",
  },
  {
    id: "apple",
    title: "Apple",
    icon: Smartphone,
    iconClass: "bg-slate-100 text-slate-700",
  },
  {
    id: "yelp",
    title: "Yelp",
    icon: Star,
    iconClass: "bg-red-100 text-red-700",
  },
  {
    id: "website",
    title: "Website",
    icon: Globe,
    iconClass: "bg-sky-100 text-sky-700",
  },
  {
    id: "facebook",
    title: "Facebook",
    icon: Facebook,
    iconClass: "bg-blue-100 text-blue-700",
  },
  {
    id: "instagram",
    title: "Instagram",
    icon: Instagram,
    iconClass: "bg-pink-100 text-pink-700",
  },
  {
    id: "appfront",
    title: "Appfront",
    icon: MonitorSmartphone,
    iconClass: "bg-violet-100 text-violet-700",
  },
];

type ServiceSection = {
  title: string;
  ids: string[];
};

const SERVICE_SECTIONS: ServiceSection[] = [
  { title: "Business Listing", ids: ["google", "apple", "yelp", "website"] },
  { title: "Geo Tagging Listing", ids: ["facebook", "instagram"] },
  { title: "Third Party", ids: ["appfront"] },
];

type PersonalInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

type LocationInfo = {
  locationName: string;
  locationEmail: string;
  locationPhone: string;
  openingDate: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

const emptyPersonal: PersonalInfo = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

const emptyLocation: LocationInfo = {
  locationName: "",
  locationEmail: "",
  locationPhone: "",
  openingDate: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

type WizardStep = "personal" | "location" | "services" | "confirm" | "success";

const PROGRESS_LABELS = [
  "Personal Info",
  "Location Info",
  "Services",
  "Confirm",
] as const;

function wizardStepIndex(s: WizardStep): number {
  if (s === "personal") return 0;
  if (s === "location") return 1;
  if (s === "services") return 2;
  if (s === "confirm") return 3;
  return -1;
}

// ─── Welcome Modal ────────────────────────────────────────────────────────────

type OnboardingWelcomeModalProps = {
  onStart: () => void;
  onClose: () => void;
};

export function OnboardingWelcomeModal({
  onStart,
  onClose,
}: OnboardingWelcomeModalProps) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleClose() {
    if (closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(() => onClose(), 220);
  }

  return (
    <div
      className={`fixed inset-0 z-[190] flex items-center justify-center p-4 ${closing ? "onbw-out" : "onbw-in"}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onb-welcome-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={handleClose}
      />
      <div className="onbw-dialog relative z-[1] w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_48px_-12px_rgba(15,23,42,0.22)]">
        <div className="h-1 w-full bg-[#2a2a2a]" />
        <div className="p-6 sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2a2a2a] shadow-lg shadow-black/20 ring-4 ring-slate-100">
            <Coffee className="h-8 w-8 text-white" />
          </div>
          <p className="mt-4 text-center text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-primary-700">
            Moka &amp; Co
          </p>
          <h2
            id="onb-welcome-title"
            className="mt-1.5 text-center text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
          >
            Welcome onboarding
          </h2>
          <p className="mt-3 text-center text-sm leading-relaxed text-slate-600 sm:text-base">
            Join the Mokanco family in a few quick steps. Tell us about yourself
            and the platforms you need — your account details will be sent
            directly to your email.
          </p>

          <div className="mt-6 grid grid-cols-4 gap-2">
            {(
              [
                { num: 1, label: "Personal\nInfo" },
                { num: 2, label: "Location\nInfo" },
                { num: 3, label: "Choose\nServices" },
                { num: 4, label: "Confirm\n& Submit" },
              ] as const
            ).map((s) => (
              <div
                key={s.num}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 px-1 py-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-700 text-[0.7rem] font-bold text-white">
                  {s.num}
                </span>
                <span className="whitespace-pre-line text-center text-[0.6rem] font-semibold leading-tight text-slate-500 sm:text-[0.65rem]">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="secondary"
              className="sm:min-w-[7rem]"
              onClick={handleClose}
            >
              Not now
            </Button>
            <Button
              type="button"
              className="!bg-[#2a2a2a] !from-[#2a2a2a] !via-[#2a2a2a] !to-[#2a2a2a] shadow-none hover:!from-[#383838] hover:!via-[#383838] hover:!to-[#383838] focus-visible:outline-neutral-600 sm:min-w-[11rem]"
              onClick={onStart}
            >
              Get started
            </Button>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes onbwDialogIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes onbwDialogOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.95) translateY(12px);
          }
        }
        .onbw-in .onbw-dialog {
          animation: onbwDialogIn 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .onbw-out .onbw-dialog {
          animation: onbwDialogOut 200ms ease-in both;
        }
        @media (prefers-reduced-motion: reduce) {
          .onbw-in .onbw-dialog,
          .onbw-out .onbw-dialog {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Wizard Panel ─────────────────────────────────────────────────────────────

function OnboardingWizardPanel({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<WizardStep>("personal");
  const [personal, setPersonal] = useState<PersonalInfo>(emptyPersonal);
  const [location, setLocation] = useState<LocationInfo>(emptyLocation);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleService = useCallback((id: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const personalValid = !!(
    personal.firstName.trim() &&
    personal.lastName.trim() &&
    personal.email.trim() &&
    personal.phone.trim() &&
    personal.address.trim() &&
    personal.city.trim() &&
    personal.state.trim() &&
    personal.zip.trim()
  );

  const locationValid = !!(
    location.locationName.trim() &&
    location.locationEmail.trim() &&
    location.locationPhone.trim() &&
    location.openingDate.trim() &&
    location.address.trim() &&
    location.city.trim() &&
    location.state.trim() &&
    location.zip.trim()
  );

  const wIdx = wizardStepIndex(step);

  const progressPercent = useMemo(() => {
    if (wIdx < 0) return 100;
    return ((wIdx + 1) / PROGRESS_LABELS.length) * 100;
  }, [wIdx]);

  function goBack() {
    if (step === "personal") onClose();
    else if (step === "location") setStep("personal");
    else if (step === "services") setStep("location");
    else if (step === "confirm") setStep("services");
  }

  function goNext() {
    if (step === "personal" && personalValid) setStep("location");
    else if (step === "location" && locationValid) setStep("services");
    else if (step === "services" && selectedServices.size > 0)
      setStep("confirm");
    else if (step === "confirm") setStep("success");
  }

  const titleId = "onb-dialog-title";

  function stepSubtitle() {
    if (step === "success")
      return "Account details will be sent to your email.";
    if (step === "personal") return "Tell us about yourself.";
    if (step === "location") return "Tell us about your location.";
    if (step === "services")
      return "Select the platforms you need support with.";
    return "Review your details before submitting.";
  }

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Top accent */}
      <div className="h-1 shrink-0 bg-[#2a2a2a]" aria-hidden />

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100/90 bg-gradient-to-b from-slate-50/80 to-white px-5 py-3.5 sm:px-6">
        <div className="min-w-0">
          <h1
            id={titleId}
            className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base"
          >
            New Location onboarding
          </h1>
          <p className="mt-0.5 text-[0.68rem] leading-snug text-slate-500 sm:text-xs">
            {stepSubtitle()}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-[0.68rem] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 sm:text-xs"
        >
          Back to login
        </button>
      </div>

      {/* Progress */}
      {step !== "success" && (
        <div className="shrink-0 space-y-2 border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
          <div
            className="flex h-1.5 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
            aria-label="Onboarding progress"
          >
            <div
              className="h-full rounded-full bg-[#2a2a2a] transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-1">
            {PROGRESS_LABELS.map((label, i) => {
              const active = i === wIdx;
              const done = i < wIdx;
              return (
                <div
                  key={label}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center transition sm:flex-row sm:justify-center sm:gap-2 sm:px-2 sm:py-2 ${
                    active
                      ? "bg-primary-50/90 shadow-sm ring-1 ring-primary-200/60"
                      : done
                        ? "opacity-90"
                        : "opacity-50"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold sm:h-7 sm:w-7 sm:text-xs ${
                      done
                        ? "bg-primary-700 text-white"
                        : active
                          ? "bg-white text-primary-800 ring-2 ring-primary-400/40"
                          : "bg-slate-100 text-slate-400"
                    }`}
                    aria-current={active ? "step" : undefined}
                  >
                    {done ? (
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`max-w-[4rem] truncate text-[0.58rem] font-semibold leading-tight sm:max-w-none sm:text-[0.65rem] ${
                      active ? "text-primary-950" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="onb-content min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50/40 px-4 py-3 sm:px-5 sm:py-4">
        <div key={step} className="onb-step-enter">
          {/* ── Step 1: Personal Information ──────────────────────── */}
          {step === "personal" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-700 text-white shadow-sm sm:h-9 sm:w-9">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                    Personal information
                  </h2>
                  <p className="text-xs text-slate-500">
                    Step 1 of 4 · All fields required
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="First name"
                  name="firstName"
                  value={personal.firstName}
                  onChange={(e) =>
                    setPersonal((p) => ({ ...p, firstName: e.target.value }))
                  }
                  autoComplete="given-name"
                  required
                />
                <Input
                  label="Last name"
                  name="lastName"
                  value={personal.lastName}
                  onChange={(e) =>
                    setPersonal((p) => ({ ...p, lastName: e.target.value }))
                  }
                  autoComplete="family-name"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Email address"
                  name="email"
                  type="email"
                  value={personal.email}
                  onChange={(e) =>
                    setPersonal((p) => ({ ...p, email: e.target.value }))
                  }
                  autoComplete="email"
                  required
                />
                <Input
                  label="Phone number"
                  name="phone"
                  type="tel"
                  placeholder="(555) 000-0000"
                  maxLength={14}
                  value={personal.phone}
                  onChange={(e) =>
                    setPersonal((p) => ({
                      ...p,
                      phone: formatUSPhone(e.target.value),
                    }))
                  }
                  autoComplete="tel"
                  required
                />
              </div>
              <AddressAutocomplete
                label="Address"
                value={personal.address}
                onChange={(v) => setPersonal((p) => ({ ...p, address: v }))}
                onSelect={(s: AddressSuggestion) =>
                  setPersonal((p) => ({
                    ...p,
                    address: s.street || s.displayName.split(",")[0],
                    city: s.city,
                    state: s.state,
                    zip: s.zip,
                  }))
                }
                required
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Input
                  label="City"
                  name="city"
                  value={personal.city}
                  onChange={(e) =>
                    setPersonal((p) => ({ ...p, city: e.target.value }))
                  }
                  autoComplete="address-level2"
                  required
                />
                <Input
                  label="State"
                  name="state"
                  value={personal.state}
                  onChange={(e) =>
                    setPersonal((p) => ({ ...p, state: e.target.value }))
                  }
                  autoComplete="address-level1"
                  required
                />
                <div className="col-span-2 sm:col-span-1">
                  <Input
                    label="Zip"
                    name="zip"
                    value={personal.zip}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, zip: e.target.value }))
                    }
                    autoComplete="postal-code"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Location Information ──────────────────────── */}
          {step === "location" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-700 text-white shadow-sm sm:h-9 sm:w-9">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                    Location information
                  </h2>
                  <p className="text-xs text-slate-500">
                    Step 2 of 4 · All fields required
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Location name"
                  name="locationName"
                  value={location.locationName}
                  onChange={(e) =>
                    setLocation((l) => ({ ...l, locationName: e.target.value }))
                  }
                  required
                />
                <Input
                  label="Email"
                  name="locationEmail"
                  type="email"
                  value={location.locationEmail}
                  onChange={(e) =>
                    setLocation((l) => ({
                      ...l,
                      locationEmail: e.target.value,
                    }))
                  }
                  autoComplete="email"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Phone"
                  name="locationPhone"
                  type="tel"
                  placeholder="(555) 000-0000"
                  maxLength={14}
                  value={location.locationPhone}
                  onChange={(e) =>
                    setLocation((l) => ({
                      ...l,
                      locationPhone: formatUSPhone(e.target.value),
                    }))
                  }
                  autoComplete="tel"
                  required
                />
                <Input
                  label="Opening date"
                  name="openingDate"
                  type="date"
                  value={location.openingDate}
                  onChange={(e) =>
                    setLocation((l) => ({ ...l, openingDate: e.target.value }))
                  }
                  required
                />
              </div>
              <AddressAutocomplete
                label="Address"
                value={location.address}
                onChange={(v) => setLocation((l) => ({ ...l, address: v }))}
                onSelect={(s: AddressSuggestion) =>
                  setLocation((l) => ({
                    ...l,
                    address: s.street || s.displayName.split(",")[0],
                    city: s.city,
                    state: s.state,
                    zip: s.zip,
                  }))
                }
                required
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Input
                  label="City"
                  name="city"
                  value={location.city}
                  onChange={(e) =>
                    setLocation((l) => ({ ...l, city: e.target.value }))
                  }
                  required
                />
                <Input
                  label="State"
                  name="state"
                  value={location.state}
                  onChange={(e) =>
                    setLocation((l) => ({ ...l, state: e.target.value }))
                  }
                  required
                />
                <div className="col-span-2 sm:col-span-1">
                  <Input
                    label="Zip"
                    name="zip"
                    value={location.zip}
                    onChange={(e) =>
                      setLocation((l) => ({ ...l, zip: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Services ──────────────────────────────────── */}
          {step === "services" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                  Select services
                </h2>
                <p className="text-xs text-slate-500">
                  Step 3 of 4 · Select one or more
                </p>
              </div>

              {SERVICE_SECTIONS.map((section) => {
                const sectionServices = SERVICE_OPTIONS.filter((o) =>
                  section.ids.includes(o.id),
                );
                return (
                  <div key={section.title} className="space-y-2">
                    <h3 className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {sectionServices.map((opt) => {
                        const Icon = opt.icon;
                        const selected = selectedServices.has(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleService(opt.id)}
                            aria-pressed={selected}
                            className={`group flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
                              selected
                                ? "border-primary-400 bg-primary-50 ring-1 ring-primary-300/40"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                                selected
                                  ? "bg-primary-700 text-white"
                                  : opt.iconClass
                              }`}
                            >
                              <Icon className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="flex-1 text-sm font-semibold leading-none text-slate-800">
                              {opt.title}
                            </span>
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                selected
                                  ? "border-primary-700 bg-primary-700 text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {selected && (
                                <Check
                                  className="h-2.5 w-2.5"
                                  strokeWidth={3}
                                />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {selectedServices.size > 0 && (
                <p className="text-xs font-medium text-primary-700">
                  {selectedServices.size} service
                  {selectedServices.size > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}

          {/* ── Step 4: Confirm ───────────────────────────────────── */}
          {step === "confirm" && (
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                  Confirm details
                </h2>
                <p className="text-xs text-slate-500">
                  Step 4 of 4 · Review before submitting
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {/* Data panel — larger */}
                <div className="min-w-0 flex-[3] rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                  {/* Personnel Information */}
                  <div className="mb-4">
                    <h3 className="mb-3 flex items-center gap-2 rounded-md bg-slate-900 px-2.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-widest text-white">
                      <User className="h-3 w-3 shrink-0" aria-hidden />
                      Personnel Information
                    </h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm text-slate-700 sm:grid-cols-3">
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          First Name
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {personal.firstName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          Last Name
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {personal.lastName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          Phone
                        </dt>
                        <dd className="mt-0.5">{personal.phone}</dd>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          Email
                        </dt>
                        <dd className="mt-0.5 break-all">{personal.email}</dd>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          Address
                        </dt>
                        <dd className="mt-0.5">{personal.address}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          City
                        </dt>
                        <dd className="mt-0.5">{personal.city}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          State
                        </dt>
                        <dd className="mt-0.5">{personal.state}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          Zip
                        </dt>
                        <dd className="mt-0.5">{personal.zip}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Location Information */}
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 rounded-md bg-slate-900 px-2.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-widest text-white">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      Location Information
                    </h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm text-slate-700 sm:grid-cols-3">
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          Location Name
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {location.locationName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          Phone
                        </dt>
                        <dd className="mt-0.5">{location.locationPhone}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          Opening Date
                        </dt>
                        <dd className="mt-0.5">{location.openingDate}</dd>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          Email
                        </dt>
                        <dd className="mt-0.5 break-all">
                          {location.locationEmail}
                        </dd>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          Address
                        </dt>
                        <dd className="mt-0.5">{location.address}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          City
                        </dt>
                        <dd className="mt-0.5">{location.city}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          State
                        </dt>
                        <dd className="mt-0.5">{location.state}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                          Zip
                        </dt>
                        <dd className="mt-0.5">{location.zip}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Services panel — smaller */}
                <div className="shrink-0 sm:w-40 rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm">
                  <h3 className="mb-2.5 flex items-center gap-1.5 rounded-md bg-slate-900 px-2 py-1.5 text-[0.7rem] font-semibold uppercase tracking-widest text-white">
                    Services
                  </h3>
                  <ul className="space-y-1.5">
                    {SERVICE_OPTIONS.filter((s) =>
                      selectedServices.has(s.id),
                    ).map((s) => {
                      const Icon = s.icon;
                      return (
                        <li
                          key={s.id}
                          className="flex items-center gap-1.5 text-xs text-slate-700"
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${s.iconClass}`}
                          >
                            <Icon className="h-3 w-3" aria-hidden />
                          </span>
                          <span className="font-medium">{s.title}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ── Success ───────────────────────────────────────────── */}
          {step === "success" && (
            <div className="mx-auto max-w-sm space-y-5 py-4 text-center sm:py-6">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full bg-amber-200/60 blur-lg"
                  aria-hidden
                />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary-400/40 shadow-md ring-4 ring-white">
                  <Check
                    className="h-10 w-10 text-primary-800"
                    strokeWidth={2.5}
                  />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  Request submitted!
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                  Your information has been shared with the admin and is
                  currently under review.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2a2a2a] text-white shadow-sm">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Check your inbox, once Approved
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      A <strong>tracking link</strong> will be sent to{" "}
                      <strong className="break-all">{personal.email}</strong>.
                      Use it to monitor the progress of your account setup in
                      real time.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Didn&apos;t receive an email? Check your spam folder or contact
                support.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-4 py-3.5 backdrop-blur-sm sm:px-6">
        {step === "success" ? (
          <Button
            type="button"
            className="ml-auto w-full !bg-[#2a2a2a] !from-[#2a2a2a] !via-[#2a2a2a] !to-[#2a2a2a] shadow-none hover:!from-[#383838] hover:!via-[#383838] hover:!to-[#383838] focus-visible:outline-neutral-600 sm:w-auto"
            onClick={onClose}
          >
            Return to sign in
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              {step === "personal" ? "Cancel" : "Back"}
            </Button>
            <Button
              type="button"
              className="!bg-[#2a2a2a] !from-[#2a2a2a] !via-[#2a2a2a] !to-[#2a2a2a] shadow-none hover:!from-[#383838] hover:!via-[#383838] hover:!to-[#383838] focus-visible:outline-neutral-600 disabled:!from-[#2a2a2a] disabled:!via-[#2a2a2a] disabled:!to-[#2a2a2a]"
              onClick={goNext}
              disabled={
                (step === "personal" && !personalValid) ||
                (step === "location" && !locationValid) ||
                (step === "services" && selectedServices.size === 0)
              }
            >
              {step === "confirm" ? "Submit request" : "Next"}
            </Button>
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
          animation: onbStepEnter 0.25s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .onb-step-enter {
            animation: none !important;
          }
        }
        /* Hide scrollbar on desktop — content is sized to fit */
        @media (min-width: 1024px) {
          .onb-content::-webkit-scrollbar {
            display: none;
          }
          .onb-content {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Split Modal ──────────────────────────────────────────────────────────────

type OnboardingWizardSplitProps = {
  onClose: () => void;
};

export function OnboardingWizardSplit({ onClose }: OnboardingWizardSplitProps) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleClose() {
    if (closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(() => onClose(), 240);
  }

  return (
    <div
      className={`fixed inset-0 z-[190] flex items-center justify-center p-3 sm:p-5 lg:p-6 ${closing ? "onbm-out" : "onbm-in"}`}
      aria-label="Onboarding wizard"
    >
      {/* Clickable area outside dialog to close */}
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close onboarding"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        className="onbm-dialog relative z-[1] flex w-full max-w-4xl overflow-hidden rounded-2xl shadow-[0_32px_80px_-8px_rgba(15,23,42,0.45)]"
        style={{ height: "min(760px, calc(100dvh - 2rem))" }}
      >
        {/* Left: branded dark panel */}
        <aside className="relative hidden w-64 shrink-0 overflow-hidden lg:block xl:w-72">
          <div className="relative flex h-full flex-col items-center justify-center bg-[#2a2a2a] px-8 py-10 text-center text-white">
            <BrandLogo variant="white" className="h-28 w-28 xl:h-32 xl:w-32" />
            <h2 className="mt-6 text-xl font-semibold tracking-tight text-white xl:text-2xl">
              New Location
              <br />
              Onboarding
            </h2>
            <p className="mt-3 text-sm/6 text-[rgb(var(--background))]/80">
              A few quick steps to get your location set up and all platforms
              ready.
            </p>
            <div className="mt-6 h-1 w-12 rounded-full bg-[#b8864f]" />
          </div>
        </aside>

        {/* Right: wizard form */}
        <div className="flex min-h-0 flex-1 flex-col">
          <OnboardingWizardPanel onClose={handleClose} />
        </div>
      </div>
      <style jsx>{`
        @keyframes onbmDialogIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(14px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes onbmDialogOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.96) translateY(14px);
          }
        }
        .onbm-in .onbm-dialog {
          animation: onbmDialogIn 340ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .onbm-out .onbm-dialog {
          animation: onbmDialogOut 220ms ease-in both;
        }
        @media (prefers-reduced-motion: reduce) {
          .onbm-in .onbm-dialog,
          .onbm-out .onbm-dialog {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
