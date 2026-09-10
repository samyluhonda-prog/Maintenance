"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QrCard({
  svg,
  code,
  name,
  number,
}: {
  svg: string;
  code: string;
  name: string;
  number: string;
}) {
  function handlePrint() {
    const win = window.open("", "_blank", "width=400,height=500");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>Étiquette — ${name}</title></head>
        <body style="font-family: sans-serif; text-align:center; padding: 24px;">
          <div>${svg}</div>
          <p style="font-weight:600; margin: 8px 0 0;">${name}</p>
          <p style="color:#666; margin:0;">${number}</p>
          <p style="color:#666; font-size:12px;">${code}</p>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <Card id="qr">
      <CardHeader>
        <CardTitle>Code QR</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <div className="rounded-md border p-3" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="font-mono text-xs text-muted-foreground">{code}</p>
        <Button variant="outline" onClick={handlePrint}>
          <Printer /> Imprimer l’étiquette
        </Button>
      </CardContent>
    </Card>
  );
}
