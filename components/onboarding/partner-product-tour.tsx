"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  markPartnerTourCompleted,
  requestSidebarExpandForTour,
} from "@/lib/partner-product-tour";

type Placement = "top" | "bottom" | "left" | "right" | "center";

type TourStep = {
  id: string;
  title: string;
  body: string;
  target?: string;
  placement?: Placement;
  expandSidebar?: boolean;
};

const STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Moka&Co",
    body: "This short tour shows how to request support, track tickets, and stay updated. It only appears once.",
    placement: "center",
  },
  {
    id: "nav",
    title: "Navigation",
    body: "Use the sidebar to switch between your Dashboard home and your Tickets list.",
    target: "partner-sidebar-nav",
    placement: "right",
    expandSidebar: true,
  },
  {
    id: "create",
    title: "Create a ticket",
    body: "Start here for any issue or request. Open a blank form and describe what you need—our team will pick it up.",
    target: "partner-create-ticket",
    placement: "bottom",
  },
  {
    id: "quick",
    title: "Quick templates",
    body: "Common requests like equipment or access issues are pre-filled. Pick a template, edit details, and submit.",
    target: "partner-quick-tickets",
    placement: "top",
  },
  {
    id: "tickets-nav",
    title: "Your tickets",
    body: "Open Tickets anytime to see status, replies, and history for everything you have submitted.",
    target: "partner-nav-tickets",
    placement: "right",
    expandSidebar: true,
  },
  {
    id: "notifications",
    title: "Stay in the loop",
    body: "The bell shows ticket updates—status changes, replies, and completions—so you never miss a response.",
    target: "partner-notifications",
    placement: "bottom",
  },
  {
    id: "done",
    title: "You are ready",
    body: "Create your first ticket whenever you need help. Our support team will keep you updated as it progresses.",
    placement: "center",
  },
];

const SPOTLIGHT_PAD = 10;

function findTarget(selector: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour="${selector}"]`);
}

function computeTooltipStyle(
  rect: DOMRect | null,
  placement: Placement,
): React.CSSProperties {
  if (!rect || placement === "center") {
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "min(24rem, calc(100vw - 2rem))",
    };
  }

  const gap = 14;
  const maxW = Math.min(384, window.innerWidth - 32);
  const style: React.CSSProperties = {
    position: "fixed",
    maxWidth: maxW,
    zIndex: 672,
  };

  if (placement === "right") {
    style.left = Math.min(rect.right + gap, window.innerWidth - maxW - 16);
    style.top = Math.max(16, Math.min(rect.top, window.innerHeight - 200));
  } else if (placement === "left") {
    style.left = Math.max(16, rect.left - gap - maxW);
    style.top = Math.max(16, Math.min(rect.top, window.innerHeight - 200));
  } else if (placement === "bottom") {
    style.left = Math.max(16, Math.min(rect.left, window.innerWidth - maxW - 16));
    style.top = Math.min(rect.bottom + gap, window.innerHeight - 220);
  } else {
    style.left = Math.max(16, Math.min(rect.left, window.innerWidth - maxW - 16));
    style.top = Math.max(16, rect.top - gap - 180);
  }

  return style;
}

type PartnerProductTourProps = {
  open: boolean;
  userId: string;
  userName?: string;
  onComplete: () => void;
};

export function PartnerProductTour({
  open,
  userId,
  userName,
  onComplete,
}: PartnerProductTourProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const placement = step?.placement ?? "center";

  const finish = useCallback(() => {
    markPartnerTourCompleted(userId);
    onComplete();
  }, [userId, onComplete]);

  const measureTarget = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }
    if (step.expandSidebar) requestSidebarExpandForTour();
    const el = findTarget(step.target);
    if (!el) {
      setTargetRect(null);
      return;
    }
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setTargetRect(el.getBoundingClientRect());
  }, [step]);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (pathname !== "/dashboard") {
      router.replace("/dashboard");
    }
  }, [open, pathname, router]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    measureTarget();
    const onLayout = () => measureTarget();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    const t = window.setTimeout(measureTarget, 320);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
      window.clearTimeout(t);
    };
  }, [open, step, stepIndex, measureTarget]);

  if (!open || typeof document === "undefined" || !step) return null;

  const welcomeName =
    userName && userName.trim().length > 0 ? userName.trim().split(/\s+/)[0] : "there";

  function goNext() {
    if (isLast) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  const spotlight =
    targetRect && step.target ? (
      <div
        className="pointer-events-none fixed z-[670] rounded-xl ring-2 ring-primary-400 ring-offset-2 ring-offset-transparent"
        style={{
          top: targetRect.top - SPOTLIGHT_PAD,
          left: targetRect.left - SPOTLIGHT_PAD,
          width: targetRect.width + SPOTLIGHT_PAD * 2,
          height: targetRect.height + SPOTLIGHT_PAD * 2,
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.72)",
        }}
        aria-hidden
      />
    ) : (
      <div
        className="fixed inset-0 z-[670] bg-slate-900/72 backdrop-blur-[2px]"
        aria-hidden
      />
    );

  return createPortal(
    <div className="fixed inset-0 z-[660]" role="presentation">
      {spotlight}

      <div
        className="pointer-events-auto relative z-[671] flex max-h-[100dvh] flex-col"
        style={computeTooltipStyle(targetRect, placement)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-tour-title"
      >
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl">
          <div className="mb-3 flex items-center gap-2 text-primary-600">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide">
              Step {stepIndex + 1} of {STEPS.length}
            </span>
          </div>

          <h2 id="partner-tour-title" className="text-lg font-semibold text-slate-900">
            {step.id === "welcome" ? `Hi ${welcomeName}, ${step.title}` : step.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {!isFirst ? (
              <Button type="button" variant="secondary" size="sm" onClick={goBack}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : null}
            <Button type="button" size="sm" className="ml-auto" onClick={goNext}>
              {isLast ? "Get started" : "Next"}
              {!isLast ? <ChevronRight className="ml-1 h-4 w-4" /> : null}
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all ${
                    i === stepIndex ? "w-6 bg-primary-600" : "w-1.5 bg-slate-200"
                  }`}
                  aria-hidden
                />
              ))}
            </div>
            <button
              type="button"
              onClick={finish}
              className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
            >
              Skip tour
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
