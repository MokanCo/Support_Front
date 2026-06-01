"use client";

import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { LoginForm } from "./login-form";
import { LoginWelcomeHeading } from "./login-welcome-heading";
import { ContactForm } from "./contact-form";
import { OnboardingWelcomeModal, OnboardingWizardSplit } from "./onboarding-wizard";
import { BrandLogo } from "@/components/BrandLogo";

/** Empty beat before the brand card fades in */
const BLANK_MS = 140;
/** After intro starts: wait for inner left animations (~2880ms) + buffer before duo */
const REVEAL_DUO_AFTER_INTRO_MS = 3050;

/** Left overlap margin eases in after duo (lg only — margin-only, no transform = no jerk) */
const LEFT_CARD_SLIDE_DELAY_MS = 450;
const LEFT_CARD_SLIDE_DURATION_MS = 3200;

type Stage = "blank" | "intro" | "duo";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "contact">("login");
  const [stage, setStage] = useState<Stage>("blank");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [onboardingPhase, setOnboardingPhase] = useState<null | "welcome" | "wizard">(null);
  const [onboardingWizardKey, setOnboardingWizardKey] = useState(0);

  function exitOnboarding() {
    setOnboardingPhase(null);
    setOnboardingWizardKey((k) => k + 1);
  }

  function beginOnboarding() {
    setOnboardingPhase("welcome");
  }

  const onboardingWelcomeLayer =
    onboardingPhase === "welcome" ? (
      <OnboardingWelcomeModal
        onStart={() => setOnboardingPhase("wizard")}
        onClose={exitOnboarding}
      />
    ) : null;

  /** Skip blank/intro and animations below lg; align with Tailwind `lg` (1024px). */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isLg = window.matchMedia("(min-width: 1024px)").matches;
    if (reduce || !isLg) {
      setReduceMotion(reduce);
      setStage("duo");
    }
  }, []);

  useEffect(() => {
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lgMq = window.matchMedia("(min-width: 1024px)");
    let tIntro: number | undefined;
    let tDuo: number | undefined;

    const clearTimers = () => {
      if (tIntro != null) window.clearTimeout(tIntro);
      if (tDuo != null) window.clearTimeout(tDuo);
      tIntro = tDuo = undefined;
    };

    const apply = () => {
      clearTimers();
      if (reduceMq.matches) {
        setReduceMotion(true);
        setStage("duo");
        return;
      }
      setReduceMotion(false);
      if (!lgMq.matches) {
        setStage("duo");
        return;
      }
      setStage("blank");
      tIntro = window.setTimeout(() => setStage("intro"), BLANK_MS);
      tDuo = window.setTimeout(
        () => setStage("duo"),
        BLANK_MS + REVEAL_DUO_AFTER_INTRO_MS,
      );
    };

    apply();
    reduceMq.addEventListener("change", apply);
    lgMq.addEventListener("change", apply);
    return () => {
      clearTimers();
      reduceMq.removeEventListener("change", apply);
      lgMq.removeEventListener("change", apply);
    };
  }, []);

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-y-auto overflow-x-hidden px-4 py-4 md:py-6">
      <div className="my-auto w-full max-w-5xl">
        {onboardingPhase === "wizard" ? (
          <OnboardingWizardSplit key={onboardingWizardKey} onClose={exitOnboarding} />
        ) : stage === "blank" ? (
          <>
            <div
              className="mx-auto min-h-[min(560px,calc(100dvh-3rem))] w-full max-w-xl lg:w-[420px]"
              aria-hidden
            />
            {onboardingWelcomeLayer}
          </>
        ) : (
          <>
          <div
            className={`login-stage-wrap mx-auto flex w-full max-w-5xl flex-col gap-8 motion-reduce:opacity-100 ${
              stage === "intro"
                ? "login-stage-intro items-center lg:min-h-[min(560px,calc(100dvh-3rem))] lg:flex-row lg:flex-nowrap lg:items-stretch lg:justify-center lg:gap-0"
                : "items-stretch opacity-100 lg:flex-row lg:items-stretch lg:justify-center lg:gap-0"
            }`}
            style={
              stage === "duo" && !reduceMotion
                ? ({
                    ["--left-slide-dur" as string]: `${LEFT_CARD_SLIDE_DURATION_MS}ms`,
                    ["--left-slide-delay" as string]: `${LEFT_CARD_SLIDE_DELAY_MS}ms`,
                  } as React.CSSProperties)
                : undefined
            }
          >
            {/* Left (brand) card — centered alone in intro; final row in duo */}
            <div
              className={`login-left-col relative z-30 hidden w-full max-w-xl shrink-0 lg:block lg:h-[min(560px,calc(100dvh-3rem))] lg:w-[420px] lg:max-w-[420px] lg:transition-[margin] lg:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:lg:transition-none ${
                stage === "duo" ? "lg:-mr-10 xl:-mr-14" : "lg:mr-0"
              }`}
              style={
                stage === "duo" && !reduceMotion
                  ? {
                      transitionDuration: "var(--left-slide-dur)",
                      transitionDelay: "var(--left-slide-delay)",
                    }
                  : undefined
              }
            >
              {/* Shadow on wrapper so overflow-hidden on the card does not clip the right-edge cast */}
              <div
                className={`h-full rounded-[3px] ${
                  stage === "duo"
                    ? "lg:shadow-[14px_0_32px_-12px_rgba(0,0,0,0.18)]"
                    : ""
                }`}
              >
                <div className="relative isolate h-full overflow-hidden rounded-[3px] bg-[#2a2a2a] px-8 py-10 text-white shadow-[0_18px_48px_rgba(0,0,0,0.22)] md:px-10 md:py-12">

                <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                  <span className="left-logo-reveal inline-flex">
                    <BrandLogo
                      variant="white"
                      className="h-36 w-36 md:h-40 md:w-40"
                    />
                  </span>
                  <h1 className="left-title-reveal mt-6 text-3xl font-semibold tracking-tight text-white">
                    Partner Support Portal
                  </h1>
                  <p className="left-subtitle-reveal mt-3 max-w-sm text-sm/6 text-[rgb(var(--background))]/90">
                    Please login with the credentials provided by the administrator.
                  </p>
                  <div className="left-divider-reveal mt-7 h-1 w-14 rounded-full bg-[#b8864f]" />
                </div>
                </div>
              </div>
            </div>

            {/* Right (form) — with duo; gentle entrance in sync with left overlap */}
            {stage === "duo" ? (
              <div
                className={`login-right-enter relative z-20 w-full max-w-xl shrink-0 lg:h-[min(560px,calc(100dvh-3rem))] lg:min-w-0 lg:overflow-y-auto ${
                  !reduceMotion ? "login-right-enter-animate" : ""
                }`}
              >
                <div className="relative w-full max-w-xl rounded-[3px] bg-white/85 shadow-[0_22px_70px_rgba(15,23,42,0.18)] backdrop-blur lg:h-full">
                  <div className="px-8 py-8 sm:px-12 sm:py-12 md:py-14">
                    <div className="mx-auto w-full max-w-sm">
                      {mode === "login" ? (
                        <>
                          <div className="flex flex-col items-center pb-2 lg:hidden">
                            <BrandLogo
                              variant="coffee"
                              className="h-28 w-28 sm:h-32 sm:w-32"
                            />
                          </div>
                          <div className="hidden lg:block">
                            <LoginWelcomeHeading />
                          </div>
                        </>
                      ) : (
                        <>
                          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                            Contact administrator
                          </h2>
                          <p className="mt-2 text-sm text-slate-500">
                            Share your details and we’ll help you get access.
                          </p>
                        </>
                      )}

                      <div className="mt-6 min-h-[300px]">
                        <Suspense
                          fallback={<p className="text-sm text-slate-500">Loading…</p>}
                        >
                          <div className="h-full overflow-y-auto">
                            {mode === "login" ? (
                              <div>
                                <LoginForm onOnboardNewLocation={beginOnboarding} />
                                <p className="mt-6 text-sm text-slate-600">
                                  Facing issues with login?{" "}
                                  <button
                                    type="button"
                                    onClick={() => setMode("contact")}
                                    className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-4 hover:text-primary-800"
                                  >
                                    Contact administrator
                                  </button>{" "}
                                  for any help.
                                </p>
                              </div>
                            ) : (
                              <ContactForm onBack={() => setMode("login")} />
                            )}
                          </div>
                        </Suspense>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {onboardingWelcomeLayer}
          </>
        )}
      </div>
      <style jsx>{`
        @keyframes loginStageFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @media (min-width: 1024px) {
          .login-stage-wrap.login-stage-intro {
            animation: loginStageFade 520ms ease forwards;
          }
          .left-logo-reveal {
            transform-origin: center center;
            opacity: 0;
            animation: logoEnter 1200ms cubic-bezier(0.22, 1, 0.36, 1) 400ms 1 forwards;
          }
          .left-title-reveal {
            opacity: 0;
            animation: contentReveal 1100ms cubic-bezier(0.22, 1, 0.36, 1) 1180ms 1 forwards;
          }
          .left-subtitle-reveal {
            opacity: 0;
            animation: contentReveal 1100ms cubic-bezier(0.22, 1, 0.36, 1) 1380ms 1 forwards;
          }
          .left-divider-reveal {
            opacity: 0;
            animation: dividerReveal 1100ms cubic-bezier(0.22, 1, 0.36, 1) 1580ms 1 forwards;
          }
        }

        @keyframes logoEnter {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes contentReveal {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes dividerReveal {
          from {
            opacity: 0;
            transform: scaleX(0.5);
          }
          to {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        @keyframes rightEnter {
          from {
            opacity: 0;
            transform: translate3d(-1.25rem, 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @media (min-width: 1024px) {
          .login-right-enter.login-right-enter-animate {
            animation: rightEnter 1000ms cubic-bezier(0.2, 1, 0.36, 1) 180ms 1 both;
          }
        }
        @media (max-width: 1023px) {
          .login-right-enter.login-right-enter-animate {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-stage-wrap.login-stage-intro {
            animation: none !important;
            opacity: 1 !important;
          }
          .left-logo-reveal,
          .left-title-reveal,
          .left-subtitle-reveal,
          .left-divider-reveal {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .login-right-enter.login-right-enter-animate {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
