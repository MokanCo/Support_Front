import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Mokanco Support
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in with the account issued by your administrator.
          </p>
        </div>
        <Card>
          <CardHeader title="Sign in" description="Email and password" />
          <CardBody>
            <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
              <LoginForm />
            </Suspense>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
