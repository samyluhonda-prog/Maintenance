"use client";

import type * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ theme = "system", ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--success)",
          "--success-text": "var(--success-foreground)",
          "--error-bg": "var(--destructive)",
          "--error-text": "var(--destructive-foreground)",
          "--warning-bg": "var(--warning)",
          "--warning-text": "var(--warning-foreground)",
          "--info-bg": "var(--info)",
          "--info-text": "var(--info-foreground)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-card! text-card-foreground! border-border! shadow-lg!",
          description: "text-muted-foreground!",
          actionButton: "bg-primary! text-primary-foreground!",
          cancelButton: "bg-secondary! text-secondary-foreground!",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
