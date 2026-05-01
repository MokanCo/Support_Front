"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { resolveApiUrl } from "@/lib/api-base";

export function ContactForm({ onBack }: { onBack: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    setLoading(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const res = await fetch(resolveApiUrl("/api/messages/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ name: fullName, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not send request. Please try again.");
        return;
      }
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("");
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Last name"
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Textarea
          label="Message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {sent ? (
          <p className="text-sm text-emerald-700">
            Message sent. An administrator will contact you shortly.
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <span className="inline-flex items-center gap-3">
              <span className="mail-scene" aria-hidden="true">
                <span className="mail-envelope" />
                <span className="mail-flap" />
                <span className="mail-letter" />
              </span>
              Sending...
            </span>
          ) : (
            "Send"
          )}
        </Button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 w-full text-center text-sm text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
      >
        Back to sign in
      </button>
      <style jsx>{`
        .mail-scene {
          position: relative;
          width: 28px;
          height: 20px;
          display: inline-block;
          animation: mailFly 1.1s ease-in-out infinite;
        }
        .mail-envelope {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 13px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
        .mail-flap {
          position: absolute;
          left: 1px;
          right: 1px;
          top: 2px;
          height: 8px;
          background: rgba(255, 255, 255, 0.55);
          clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
          transform-origin: top center;
          animation: flapClose 1.1s ease-in-out infinite;
        }
        .mail-letter {
          position: absolute;
          left: 4px;
          right: 4px;
          top: 1px;
          height: 10px;
          border-radius: 1px;
          background: white;
          animation: letterDrop 1.1s ease-in-out infinite;
        }
        @keyframes letterDrop {
          0%,
          20% {
            transform: translateY(-7px);
            opacity: 1;
          }
          45%,
          100% {
            transform: translateY(3px);
            opacity: 0.92;
          }
        }
        @keyframes flapClose {
          0%,
          30% {
            transform: rotateX(0deg);
          }
          45%,
          100% {
            transform: rotateX(180deg);
          }
        }
        @keyframes mailFly {
          0%,
          55%,
          100% {
            transform: translate(0, 0);
          }
          75% {
            transform: translate(5px, -1px);
          }
        }
      `}</style>
    </div>
  );
}

