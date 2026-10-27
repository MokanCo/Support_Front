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
import { createPublicCardSetupIntent } from "@/lib/queries/public-ach-setup";

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
  onSkip: () => void;
  onError: (message: string) => void;
};

function IntroStep({
  token,
  onError,
  onSkip,
  onReady,
}: {
  token: string;
  onError: (message: string) => void;
  onSkip: () => void;
  onReady: (clientSecret: string, publishableKey: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    onError("");
    try {
      const res = await createPublicCardSetupIntent(token);
      onReady(res.clientSecret, res.publishableKey);
    } catch (e) {
      onError((e as Error).message || "Could not start card setup.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Optionally add a backup card. It&apos;s never charged automatically —
        it&apos;s only used if the business manually chooses to charge it, for
        example if a bank debit doesn&apos;t go through.
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onSkip} disabled={loading}>
          Skip for now
        </Button>
        <Button className="flex-1" disabled={loading} onClick={start}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing…
            </>
          ) : (
            "Add a card"
          )}
        </Button>
      </div>
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
      onError(error.message || "Card could not be saved.");
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
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving card…
          </>
        ) : (
          "Save card"
        )}
      </Button>
    </div>
  );
}

/** Optional second step of the setup wizard — saves a backup credit card on
 *  the same Stripe customer as the linked bank account. */
export function CardSetupForm({ token, onLinked, onSkip, onError }: Props) {
  const [intent, setIntent] = useState<{ clientSecret: string; publishableKey: string } | null>(
    null,
  );

  const stripePromise = useMemo(
    () => (intent ? stripePromiseFor(intent.publishableKey) : null),
    [intent],
  );

  if (!intent) {
    return (
      <IntroStep
        token={token}
        onError={onError}
        onSkip={onSkip}
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
