"use client";

import { useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createPublicAchSetupIntent } from "@/lib/queries/public-ach-setup";

const stripeCache = new Map<string, Promise<Stripe | null>>();
function stripePromiseFor(publishableKey: string) {
  let p = stripeCache.get(publishableKey);
  if (!p) {
    p = loadStripe(publishableKey);
    stripeCache.set(publishableKey, p);
  }
  return p;
}

type Props = {
  token: string;
  onLinked: () => void;
  onError: (message: string) => void;
};

function MandateStep({
  token,
  onError,
  onReady,
}: {
  token: string;
  onError: (message: string) => void;
  onReady: (clientSecret: string, publishableKey: string) => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    onError("");
    try {
      const res = await createPublicAchSetupIntent(token);
      onReady(res.clientSecret, res.publishableKey);
    } catch (e) {
      onError((e as Error).message || "Could not start bank setup.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>
          I authorize this business to electronically debit my bank account for
          future invoices via the ACH network, without requiring a new
          authorization each time. This authorization remains in effect until I
          withdraw it by notifying the business.
        </span>
      </label>
      <Button className="w-full" disabled={!agreed || loading} onClick={start}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing…
          </>
        ) : (
          "Continue to link bank account"
        )}
      </Button>
    </div>
  );
}

function ConfirmStep({
  onLinked,
  onError,
}: {
  onLinked: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    onError("");
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}${window.location.search}`,
      },
    });
    setSubmitting(false);
    if (error) {
      onError(error.message || "Bank account could not be linked.");
      return;
    }
    if (setupIntent) onLinked();
  }

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      <Button className="w-full" disabled={!stripe || submitting} onClick={handleSubmit}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Linking bank account…
          </>
        ) : (
          "Link bank account"
        )}
      </Button>
    </div>
  );
}

/** One-time (not tied to any invoice) form for a customer to link and
 *  authorize their bank account for future automatic ACH billing. */
export function AchSetupForm({ token, onLinked, onError }: Props) {
  const [intent, setIntent] = useState<{ clientSecret: string; publishableKey: string } | null>(
    null,
  );

  const stripePromise = useMemo(
    () => (intent ? stripePromiseFor(intent.publishableKey) : null),
    [intent],
  );

  if (!intent) {
    return (
      <MandateStep
        token={token}
        onError={onError}
        onReady={(clientSecret, publishableKey) => setIntent({ clientSecret, publishableKey })}
      />
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret: intent.clientSecret, appearance: { theme: "stripe" } }}
    >
      <ConfirmStep onLinked={onLinked} onError={onError} />
    </Elements>
  );
}
