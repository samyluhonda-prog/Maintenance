"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function resolvePathFromScan(text: string): string | null {
  try {
    const url = new URL(text);
    if (url.pathname.startsWith("/scan/")) return url.pathname;
  } catch {
    // not a URL — treat as a bare code typed/scanned without the host part
  }
  const trimmed = text.trim();
  if (/^[A-Z]{2,3}-[A-Z0-9]{4,12}$/i.test(trimmed)) return `/scan/${trimmed.toUpperCase()}`;
  return null;
}

export function ScannerClient() {
  const elementId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          const path = resolvePathFromScan(decodedText);
          if (path) {
            void scanner.stop().catch(() => {});
            router.push(path);
          }
        },
        () => {
          // per-frame "no QR found" callback — expected most frames, ignore
        },
      )
      .catch(() => {
        if (!cancelled) setError("Impossible d’accéder à la caméra. Vérifiez les permissions du navigateur.");
      });

    return () => {
      cancelled = true;
      scanner.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-sm p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="size-5" /> Scanner un code
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div id={elementId} ref={containerRef} className="overflow-hidden rounded-md bg-muted" />
          {error && <p className="text-sm text-destructive">{error}</p>}

          <form
            className="grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const path = resolvePathFromScan(manualCode);
              if (path) router.push(path);
              else setError("Code invalide. Format attendu : EQ-XXXXXXXX.");
            }}
          >
            <label className="text-sm font-medium">Ou saisissez le code manuellement</label>
            <div className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="EQ-7F3K9QRT"
              />
              <Button type="submit">Ouvrir</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
