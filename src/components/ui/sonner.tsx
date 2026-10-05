"use client";

import { CircleCheckIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { Spinner } from "@/components/ui/spinner";

/*
 * Toasts sit at the bottom on phones (thumb reach) and bottom-right on desktop.
 * They never block; 4s default; announced via role="status".
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      duration={4000}
      closeButton={false}
      gap={8}
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-ink-muted" />,
        warning: <TriangleAlertIcon className="size-4 text-warning" />,
        error: <OctagonXIcon className="size-4 text-danger" />,
        loading: <Spinner className="size-4" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink shadow-(--shadow-float)",
          title: "font-medium",
          description: "text-ink-muted",
          actionButton: "ml-auto h-8 shrink-0 rounded-sm bg-ink px-3 text-xs font-medium text-bg",
          cancelButton: "ml-auto h-8 shrink-0 rounded-sm border border-line px-3 text-xs font-medium",
          icon: "shrink-0",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
