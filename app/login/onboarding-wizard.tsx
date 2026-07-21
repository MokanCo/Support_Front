"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Plus,
  Smartphone,
  Star,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import type { AddressSuggestion } from "@/components/ui/address-autocomplete";
import { formatUSPhone } from "@/lib/format";
import {
  checkEmailAvailable,
  createOnboardingDraft,
  fetchOnboardingConfig,
  fetchOnboardingServices,
  finalizeOnboardingRequest,
  saveOnboardingServices,
  type OnboardingConfig,
  type OnboardingService,
  type OnboardingServiceSection,
  type LocationInfo,
  type PersonalInfo,
} from "@/lib/queries/onboarding";

const SERVICE_ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  smartphone: Smartphone,
  star: Star,
  facebook: Facebook,
  instagram: Instagram,
  monitor: MonitorSmartphone,
};

function serviceIcon(iconKey: string): LucideIcon {
  return SERVICE_ICONS[iconKey] ?? Globe;
}

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

function wizardStepIndex(s: WizardStep): number {
  if (s === "personal") return 0;
  if (s === "location") return 1;
  if (s === "services") return 2;
  if (s === "confirm") return 3;
  return -1;
}

// ─── Welcome Modal ────────────────────────────────────────────────────────────

type OnboardingWelcomeModalProps = {
  config: OnboardingConfig | null;
  configLoading: boolean;
  onStart: () => void;
  onClose: () => void;
};

export function OnboardingWelcomeModal({
  config,
  configLoading,
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
            {config?.brandName || "Onboarding"}
          </p>
          <h2
            id="onb-welcome-title"
            className="mt-1.5 text-center text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
          >
            {configLoading
              ? "Loading…"
              : config?.welcomeTitle || "Onboarding unavailable"}
          </h2>
          <p className="mt-3 text-center text-sm leading-relaxed text-slate-600 sm:text-base">
            {configLoading
              ? "Please wait while we load onboarding details."
              : config?.welcomeDescription ||
                "Onboarding has not been configured yet. Please contact your administrator."}
          </p>

          {config && config.welcomeSteps.length > 0 ? (
            <div className="mt-6 grid grid-cols-4 gap-2">
              {config.welcomeSteps.map((s) => (
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
          ) : null}

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
              disabled={configLoading || !config}
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

function OnboardingWizardPanel({
  config,
  serviceSections,
  servicesLoading,
  onClose,
}: {
  config: OnboardingConfig | null;
  serviceSections: OnboardingServiceSection[];
  servicesLoading: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<WizardStep>("personal");
  const [partners, setPartners] = useState<PersonalInfo[]>([
    { ...emptyPersonal },
  ]);
  const [location, setLocation] = useState<LocationInfo>(emptyLocation);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(
    () => new Set(),
  );
  const [duplicateErrors, setDuplicateErrors] = useState<Record<number, string>>({});
  const [registeredErrors, setRegisteredErrors] = useState<Record<number, string>>({});
  const [checkingIdx, setCheckingIdx] = useState<Set<number>>(new Set());
  const emailErrors = useMemo(
    () => ({ ...registeredErrors, ...duplicateErrors }),
    [registeredErrors, duplicateErrors],
  );
  // Refs so async/delayed handlers always read current state, not stale closures
  const partnersRef = useRef(partners);
  useEffect(() => { partnersRef.current = partners; }, [partners]);
  const duplicateErrorsRef = useRef(duplicateErrors);
  useEffect(() => { duplicateErrorsRef.current = duplicateErrors; }, [duplicateErrors]);
  const emailCheckTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [draftToken, setDraftToken] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [servicesSaveError, setServicesSaveError] = useState<string | null>(
    null,
  );

  const progressLabels = config?.stepLabels ?? [];
  const allServices = useMemo(
    () => serviceSections.flatMap((s) => s.services),
    [serviceSections],
  );
  const serviceById = useMemo(() => {
    const map = new Map<string, OnboardingService>();
    for (const s of allServices) map.set(s.id, s);
    return map;
  }, [allServices]);

  const toggleService = useCallback(
    (id: string) => {
      setSelectedServices((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        if (draftToken) {
          const slugs = Array.from(next);
          saveOnboardingServices(draftToken, slugs).catch(() => {
            setServicesSaveError("Could not save selection. Please try again.");
          });
        }
        return next;
      });
      setServicesSaveError(null);
    },
    [draftToken],
  );

  function isPartnerValid(p: PersonalInfo) {
    return !!(
      p.firstName.trim() &&
      p.lastName.trim() &&
      p.email.trim() &&
      p.phone.trim() &&
      p.address.trim() &&
      p.city.trim() &&
      p.state.trim() &&
      p.zip.trim()
    );
  }

  const personalValid = partners.length > 0 && partners.every(isPartnerValid);

  function checkDuplicates(currentPartners: PersonalInfo[]) {
    const seen: Record<string, number[]> = {};
    for (let i = 0; i < currentPartners.length; i++) {
      const email = currentPartners[i].email.trim().toLowerCase();
      if (!email) continue;
      (seen[email] ??= []).push(i);
    }
    const errors: Record<number, string> = {};
    for (const indices of Object.values(seen)) {
      if (indices.length > 1) {
        for (const idx of indices) {
          errors[idx] = "Already used by another owner in this form.";
        }
      }
    }
    setDuplicateErrors(errors);
  }

  function updatePartner(index: number, patch: Partial<PersonalInfo>) {
    const updated = partners.map((p, i) => (i === index ? { ...p, ...patch } : p));
    setPartners(updated);
    if (patch.email !== undefined) {
      checkDuplicates(updated);
      setRegisteredErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      scheduleEmailCheck(index);
    }
  }

  function addPartner() {
    setPartners((prev) => [...prev, { ...emptyPersonal }]);
  }

  function removePartner(index: number) {
    // Cancel all pending debounced checks — indices shift after removal
    for (const timer of Object.values(emailCheckTimers.current)) clearTimeout(timer);
    emailCheckTimers.current = {};
    const updated = partners.filter((_, i) => i !== index);
    setPartners(updated);
    checkDuplicates(updated);
    // Re-index: cards after the removed one shift down by 1
    setRegisteredErrors((prev) => {
      const next: Record<number, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        const n = Number(k);
        if (n < index) next[n] = v;
        else if (n > index) next[n - 1] = v;
      }
      return next;
    });
    setCheckingIdx((prev) => {
      const next = new Set<number>();
      for (const n of prev) {
        if (n < index) next.add(n);
        else if (n > index) next.add(n - 1);
      }
      return next;
    });
  }

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
    return ((wIdx + 1) / progressLabels.length) * 100;
  }, [wIdx, progressLabels.length]);

  function goBack() {
    if (step === "personal") onClose();
    else if (step === "location") setStep("personal");
    else if (step === "services") setStep("location");
    else if (step === "confirm") setStep("services");
  }

  async function ensureDraft() {
    if (draftToken) return draftToken;
    setDraftLoading(true);
    setServicesSaveError(null);
    try {
      const result = await createOnboardingDraft({
        personal: partners[0],
        additionalPartners: partners.slice(1),
        location,
        trackingToken: draftToken ?? undefined,
      });
      setDraftToken(result.trackingToken);
      if (result.request.selectedServices?.length) {
        setSelectedServices(new Set(result.request.selectedServices));
      }
      return result.trackingToken;
    } catch (e) {
      setServicesSaveError(
        e instanceof Error ? e.message : "Could not start services step",
      );
      return null;
    } finally {
      setDraftLoading(false);
    }
  }

  function scheduleEmailCheck(idx: number) {
    clearTimeout(emailCheckTimers.current[idx]);
    emailCheckTimers.current[idx] = setTimeout(() => {
      void handleEmailBlur(idx);
    }, 600);
  }

  async function handleEmailBlur(idx: number) {
    clearTimeout(emailCheckTimers.current[idx]);
    delete emailCheckTimers.current[idx];
    const email = partnersRef.current[idx]?.email.trim().toLowerCase();
    if (!email || duplicateErrorsRef.current[idx]) return;
    setCheckingIdx((prev) => new Set([...prev, idx]));
    try {
      const { available } = await checkEmailAvailable(email);
      // Guard: email may have changed while the request was in flight — discard stale result
      const currentEmail = partnersRef.current[idx]?.email.trim().toLowerCase();
      if (currentEmail !== email) return;
      setRegisteredErrors((prev) => {
        const next = { ...prev };
        if (!available) {
          next[idx] = "Email already registered to another location.";
        } else {
          delete next[idx];
        }
        return next;
      });
    } catch {
      // network error — allow through
    } finally {
      // Only release spinner if this check is still the relevant one
      const currentEmail = partnersRef.current[idx]?.email.trim().toLowerCase();
      if (currentEmail === email) {
        setCheckingIdx((prev) => {
          const next = new Set(prev);
          next.delete(idx);
          return next;
        });
      }
    }
  }

  async function verifyUncheckedEmails(): Promise<boolean> {
    // Emails not yet verified via blur (neither errored nor confirmed available)
    const unchecked = partners
      .map((p, idx) => ({ idx, email: p.email.trim().toLowerCase() }))
      .filter(({ idx, email }) => email && !duplicateErrors[idx] && !(idx in registeredErrors) && !checkingIdx.has(idx));
    if (unchecked.length === 0) return Object.keys(emailErrors).length === 0;
    setCheckingIdx((prev) => new Set([...prev, ...unchecked.map((u) => u.idx)]));
    const newErrors: Record<number, string> = {};
    await Promise.all(
      unchecked.map(async ({ idx, email }) => {
        try {
          const { available } = await checkEmailAvailable(email);
          if (!available) newErrors[idx] = "Email already registered to another location.";
        } catch { /* network error — allow through */ }
      }),
    );
    setRegisteredErrors((prev) => ({ ...prev, ...newErrors }));
    setCheckingIdx((prev) => {
      const next = new Set(prev);
      unchecked.forEach(({ idx }) => next.delete(idx));
      return next;
    });
    // Use the freshly computed state to decide — don't read stale closure
    const freshRegistered = { ...registeredErrors, ...newErrors };
    const combined = { ...freshRegistered, ...duplicateErrors };
    return Object.keys(combined).length === 0;
  }

  async function goNext() {
    if (step === "personal" && personalValid) {
      const ok = await verifyUncheckedEmails();
      if (ok) setStep("location");
      return;
    } else if (step === "location" && locationValid) {
      const token = await ensureDraft();
      if (token) setStep("services");
    } else if (step === "services" && selectedServices.size > 0)
      setStep("confirm");
    else if (step === "confirm") {
      if (!draftToken) {
        setSubmitError("Session expired. Go back and try again.");
        return;
      }
      setSubmitError(null);
      setSubmitting(true);
      try {
        const result = await finalizeOnboardingRequest(draftToken);
        setStep("success");
        void result;
      } catch (e) {
        setSubmitError(
          e instanceof Error ? e.message : "Failed to submit request",
        );
      } finally {
        setSubmitting(false);
      }
    }
  }

  const titleId = "onb-dialog-title";

  function stepSubtitle() {
    const subtitles = config?.stepSubtitles ?? {};
    if (step === "success") return subtitles.success ?? "";
    if (step === "personal") return subtitles.personal ?? "";
    if (step === "location") return subtitles.location ?? "";
    if (step === "services") return subtitles.services ?? "";
    return subtitles.confirm ?? "";
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
            {config?.wizardTitle || "Onboarding"}
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
            {progressLabels.map((label, i) => {
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

              <div className="space-y-3">
                {partners.map((partner, idx) => (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-[0.6rem] font-bold text-white">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          {idx === 0 ? "Primary Owner" : `Owner ${idx + 1}`}
                        </span>
                      </div>
                      {partners.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePartner(idx)}
                          className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          aria-label={`Remove owner ${idx + 1}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Card fields */}
                    <div className="space-y-3 p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label="First name"
                          name={`firstName-${idx}`}
                          value={partner.firstName}
                          onChange={(e) =>
                            updatePartner(idx, { firstName: e.target.value })
                          }
                          autoComplete="given-name"
                          required
                        />
                        <Input
                          label="Last name"
                          name={`lastName-${idx}`}
                          value={partner.lastName}
                          onChange={(e) =>
                            updatePartner(idx, { lastName: e.target.value })
                          }
                          autoComplete="family-name"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <Input
                            label="Email address"
                            name={`email-${idx}`}
                            type="email"
                            value={partner.email}
                            onChange={(e) =>
                              updatePartner(idx, { email: e.target.value })
                            }
                            onBlur={() => void handleEmailBlur(idx)}
                            autoComplete="email"
                            required
                          />
                          <p
                            className={`mt-1 min-h-[1rem] text-xs transition-all duration-200 ${
                              emailErrors[idx]
                                ? "font-medium text-red-600 opacity-100"
                                : checkingIdx.has(idx)
                                  ? "text-slate-400 opacity-100"
                                  : "opacity-0 select-none"
                            }`}
                            aria-live="polite"
                          >
                            {emailErrors[idx] ?? (checkingIdx.has(idx) ? "Checking…" : " ")}
                          </p>
                        </div>
                        <Input
                          label="Phone number"
                          name={`phone-${idx}`}
                          type="tel"
                          placeholder="(555) 000-0000"
                          maxLength={14}
                          value={partner.phone}
                          onChange={(e) =>
                            updatePartner(idx, {
                              phone: formatUSPhone(e.target.value),
                            })
                          }
                          autoComplete="tel"
                          required
                        />
                      </div>
                      <AddressAutocomplete
                        label="Address"
                        value={partner.address}
                        onChange={(v) => updatePartner(idx, { address: v })}
                        onSelect={(s: AddressSuggestion) =>
                          updatePartner(idx, {
                            address: s.street || s.displayName.split(",")[0],
                            city: s.city,
                            state: s.state,
                            zip: s.zip,
                          })
                        }
                        required
                      />
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Input
                          label="City"
                          name={`city-${idx}`}
                          value={partner.city}
                          onChange={(e) =>
                            updatePartner(idx, { city: e.target.value })
                          }
                          autoComplete="address-level2"
                          required
                        />
                        <Input
                          label="State"
                          name={`state-${idx}`}
                          value={partner.state}
                          onChange={(e) =>
                            updatePartner(idx, { state: e.target.value })
                          }
                          autoComplete="address-level1"
                          required
                        />
                        <div className="col-span-2 sm:col-span-1">
                          <Input
                            label="Zip"
                            name={`zip-${idx}`}
                            value={partner.zip}
                            onChange={(e) =>
                              updatePartner(idx, { zip: e.target.value })
                            }
                            autoComplete="postal-code"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Owner button */}
                <button
                  type="button"
                  onClick={addPartner}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-primary-400 hover:bg-primary-50/40 hover:text-primary-700"
                >
                  <Plus className="h-4 w-4" />
                  Add secondary owner
                </button>
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

              {servicesLoading || draftLoading ? (
                <p className="text-sm text-slate-500">Loading services…</p>
              ) : serviceSections.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No services have been added yet. An administrator must
                  configure service options before you can continue.
                </p>
              ) : (
                serviceSections.map((section) => (
                  <div key={section.title} className="space-y-2">
                    <h3 className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {section.services.map((opt) => {
                        const Icon = serviceIcon(opt.iconKey);
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
                ))
              )}

              {servicesSaveError && (
                <p className="text-xs font-medium text-red-600" role="alert">
                  {servicesSaveError}
                </p>
              )}

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
                    <div className="space-y-3">
                      {partners.map((p, idx) => (
                        <div key={idx}>
                          {partners.length > 1 && (
                            <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-widest text-primary-700">
                              {idx === 0 ? "Primary Owner" : `Owner ${idx + 1}`}
                            </p>
                          )}
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm text-slate-700 sm:grid-cols-3">
                            <div>
                              <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                                First Name
                              </dt>
                              <dd className="mt-0.5 font-medium">
                                {p.firstName}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                                Last Name
                              </dt>
                              <dd className="mt-0.5 font-medium">
                                {p.lastName}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                                Phone
                              </dt>
                              <dd className="mt-0.5">{p.phone}</dd>
                            </div>
                            <div className="col-span-2 sm:col-span-3">
                              <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                                Email
                              </dt>
                              <dd className="mt-0.5 break-all">{p.email}</dd>
                            </div>
                            <div className="col-span-2 sm:col-span-3">
                              <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                                Address
                              </dt>
                              <dd className="mt-0.5">{p.address}</dd>
                            </div>
                            <div>
                              <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                                City
                              </dt>
                              <dd className="mt-0.5">{p.city}</dd>
                            </div>
                            <div>
                              <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                                State
                              </dt>
                              <dd className="mt-0.5">{p.state}</dd>
                            </div>
                            <div>
                              <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">
                                Zip
                              </dt>
                              <dd className="mt-0.5">{p.zip}</dd>
                            </div>
                          </dl>
                          {idx < partners.length - 1 && (
                            <div className="mt-3 border-t border-slate-100" />
                          )}
                        </div>
                      ))}
                    </div>
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
                    {Array.from(selectedServices)
                      .map((id) => serviceById.get(id))
                      .filter(Boolean)
                      .map((s) => {
                        const Icon = serviceIcon(s!.iconKey);
                        return (
                          <li
                            key={s!.id}
                            className="flex items-center gap-1.5 text-xs text-slate-700"
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${s!.iconClass}`}
                            >
                              <Icon className="h-3 w-3" aria-hidden />
                            </span>
                            <span className="font-medium">{s!.title}</span>
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
                  {config?.successTitle || "Request submitted!"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                  {config?.successDescription || ""}
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
                      Once approved, a tracking link will be emailed to{" "}
                      <strong className="break-all">
                        {partners[0]?.email}
                      </strong>
                      .
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
            {submitError && (
              <p className="w-full text-sm text-red-600" role="alert">
                {submitError}
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              className="gap-1.5"
              disabled={submitting}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              {step === "personal" ? "Cancel" : "Back"}
            </Button>
            <Button
              type="button"
              className="!bg-[#2a2a2a] !from-[#2a2a2a] !via-[#2a2a2a] !to-[#2a2a2a] shadow-none hover:!from-[#383838] hover:!via-[#383838] hover:!to-[#383838] focus-visible:outline-neutral-600 disabled:!from-[#2a2a2a] disabled:!via-[#2a2a2a] disabled:!to-[#2a2a2a]"
              onClick={goNext}
              disabled={
                submitting ||
                draftLoading ||
                checkingIdx.size > 0 ||
                (step === "personal" &&
                  (!personalValid || Object.keys(emailErrors).length > 0)) ||
                (step === "location" && !locationValid) ||
                (step === "services" &&
                  (servicesLoading ||
                    draftLoading ||
                    selectedServices.size === 0 ||
                    serviceSections.length === 0))
              }
            >
              {submitting
                ? "Submitting…"
                : checkingIdx.size > 0
                  ? "Checking…"
                  : step === "confirm"
                    ? "Submit request"
                    : "Next"}
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
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [serviceSections, setServiceSections] = useState<
    OnboardingServiceSection[]
  >([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setConfigLoading(true);
    fetchOnboardingConfig()
      .then((c) => {
        if (!cancelled) setConfig(c);
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });
    setServicesLoading(true);
    fetchOnboardingServices()
      .then((sections) => {
        if (!cancelled) setServiceSections(sections);
      })
      .catch(() => {
        if (!cancelled) setServiceSections([]);
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!configLoading && !config) {
    return (
      <div className="fixed inset-0 z-[190] flex items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <p className="text-sm text-slate-600">
            Onboarding is not configured yet. Please contact your administrator.
          </p>
          <Button type="button" className="mt-4" onClick={onClose}>
            Back to login
          </Button>
        </div>
      </div>
    );
  }

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
            <h2 className="mt-6 text-xl font-semibold tracking-tight text-white xl:text-2xl whitespace-pre-line">
              {config?.wizardSidebarTitle || ""}
            </h2>
            <p className="mt-3 text-sm/6 text-[rgb(var(--background))]/80">
              {config?.wizardSidebarDescription || ""}
            </p>
            <div className="mt-6 h-1 w-12 rounded-full bg-[#b8864f]" />
          </div>
        </aside>

        {/* Right: wizard form */}
        <div className="flex min-h-0 flex-1 flex-col">
          {config ? (
            <OnboardingWizardPanel
              config={config}
              serviceSections={serviceSections}
              servicesLoading={servicesLoading}
              onClose={handleClose}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
              Loading onboarding…
            </div>
          )}
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
