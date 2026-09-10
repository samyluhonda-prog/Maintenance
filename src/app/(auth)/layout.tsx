import { LogoMark } from "@/components/auth/logo-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-secondary/40 px-4 py-12">
      <div className="flex items-center gap-2">
        <LogoMark className="size-8" />
        <span className="text-xl font-semibold tracking-tight">Intervia</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
