import * as React from "react";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InlineErrorProps = {
  title: string;
  description?: string;
  /** Rendered inside the alert, e.g. a retry button. */
  action?: React.ReactNode;
  className?: string;
};

/** Inline error for a region of a page (a failed widget, a rejected form). */
export function InlineError({ title, description, action, className }: InlineErrorProps) {
  return (
    <Alert variant="danger" className={className}>
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      {description ? <AlertDescription>{description}</AlertDescription> : null}
      {action ? <AlertAction>{action}</AlertAction> : null}
    </Alert>
  );
}

type PageErrorProps = {
  code?: string;
  title: string;
  description: string;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
};

/** Full-page error / 404 composition: calm, branded, one clear next step. */
export function PageError({ code, title, description, primary, secondary, className }: PageErrorProps) {
  return (
    <section className={cn("mx-auto flex max-w-xl flex-col items-center gap-5 py-20 text-center", className)}>
      {code ? <p className="type-eyebrow text-ink-subtle">{code}</p> : null}
      <h1 className="type-h1">{title}</h1>
      <p className="type-body text-ink-muted">{description}</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        {primary ?? <Button>Back to home</Button>}
        {secondary}
      </div>
    </section>
  );
}
