import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AccountNotConfigured() {
  return (
    <Alert variant="warning">
      <AlertTitle>Account data is unavailable on this environment</AlertTitle>
      <AlertDescription>The store database is not configured. See README → Database.</AlertDescription>
    </Alert>
  );
}

export function AccountHeading({ eyebrow = "Account", title, intro }: { eyebrow?: string; title: string; intro?: string | undefined }) {
  return (
    <header className="mb-6">
      <p className="type-eyebrow text-ink-subtle">{eyebrow}</p>
      <h1 className="type-h2 mt-1">{title}</h1>
      {intro ? <p className="type-small mt-2 text-ink-muted">{intro}</p> : null}
    </header>
  );
}
