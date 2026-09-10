import Link from "next/link";

import { LogoMark } from "@/components/auth/logo-mark";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="text-lg font-semibold tracking-tight">Intervia</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Connexion</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Créer un compte</Link>
          </Button>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          La maintenance industrielle, sans friction.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground text-balance">
          Équipements, bons de travail, préventif, pièces et fournisseurs — une seule plateforme,
          pensée pour le terrain autant que pour le bureau.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Commencer gratuitement</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">J’ai déjà un compte</Link>
          </Button>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Intervia
      </footer>
    </div>
  );
}
