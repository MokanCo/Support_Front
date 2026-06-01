export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="login-shell relative min-h-dvh">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[url('/m-bg.jpg')] bg-cover bg-center bg-no-repeat lg:bg-[url('/d-bg.jpg')]"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
