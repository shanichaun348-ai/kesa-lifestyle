import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/storefront/container";
import { PageError } from "@/components/storefront/error-state";

export default function NotFound() {
  return (
    <Container>
      <PageError
        code="404"
        title="We couldn't find that page"
        description="The link may be out of date, or the piece may have moved to a new home."
        primary={
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        }
        secondary={
          <Button variant="secondary" asChild>
            <Link href="/collections/new-arrivals/">See new arrivals</Link>
          </Button>
        }
      />
    </Container>
  );
}
