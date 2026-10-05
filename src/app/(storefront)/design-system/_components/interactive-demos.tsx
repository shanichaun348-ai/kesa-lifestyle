"use client";

import * as React from "react";
import { RefreshCwIcon, ShoppingBagIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CartDrawer, type CartDrawerLine } from "@/components/storefront/cart-drawer";
import { InlineError } from "@/components/storefront/error-state";

export function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Open size guide</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ring size guide</DialogTitle>
          <DialogDescription>
            Wrap a strip of paper around the base of your finger and measure the length in millimetres.
          </DialogDescription>
        </DialogHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              <th className="py-2 font-medium">Indian size</th>
              <th className="py-2 font-medium">Circumference</th>
              <th className="py-2 font-medium">US size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[
              ["10", "50.0 mm", "5.5"],
              ["12", "51.5 mm", "6"],
              ["14", "54.0 mm", "7"],
              ["16", "56.5 mm", "8"],
            ].map(([ind, circ, us]) => (
              <tr key={ind}>
                <td className="py-2">{ind}</td>
                <td className="py-2 tabular-nums">{circ}</td>
                <td className="py-2">{us}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Close</Button>
          </DialogClose>
          <Button>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DrawerDemo({ lines }: { lines: CartDrawerLine[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      <CartDrawer
        lines={lines}
        trigger={
          <Button variant="secondary">
            <ShoppingBagIcon aria-hidden="true" />
            Open bag drawer
          </Button>
        }
      />
      <CartDrawer lines={[]} trigger={<Button variant="ghost">Open empty bag</Button>} />
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost">Bottom sheet (filters)</Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="gap-0 p-0">
          <SheetHeader>
            <SheetTitle>Filter</SheetTitle>
            <SheetDescription>Bottom sheets hold filters on phones.</SheetDescription>
          </SheetHeader>
          <div className="px-5 py-4 text-sm text-ink-muted">Filter controls render here in Phase 1.</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => toast.success("Added to bag", { description: "Pearl Drop Earrings" })}>
        Success
      </Button>
      <Button variant="secondary" onClick={() => toast("Saved to wishlist")}>
        Neutral
      </Button>
      <Button variant="secondary" onClick={() => toast.warning("Only 2 left in stock")}>
        Warning
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.error("Couldn't apply coupon", {
            description: "Minimum order ₹999.",
            action: { label: "Retry", onClick: () => undefined },
          })
        }
      >
        Error with action
      </Button>
    </div>
  );
}

export function TabsDemo() {
  return (
    <div className="flex flex-col gap-10">
      <Tabs defaultValue="details">
        <TabsList variant="line" aria-label="Product information">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="care">Care</TabsTrigger>
          <TabsTrigger value="shipping">Shipping &amp; returns</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="pt-5 text-ink-muted">
          Gold-toned brass with freshwater pearl drops. Lightweight at 6 g per earring; push-back closure.
        </TabsContent>
        <TabsContent value="care" className="pt-5 text-ink-muted">
          Keep away from perfume and water. Store in the pouch provided.
        </TabsContent>
        <TabsContent value="shipping" className="pt-5 text-ink-muted">
          Ships in 1–2 days. Free over ₹999. 7-day returns on unworn pieces.
        </TabsContent>
      </Tabs>

      <Tabs defaultValue="orders" className="max-w-md">
        <TabsList aria-label="Account sections">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="pt-4 text-ink-muted">
          Segmented variant for account and admin surfaces.
        </TabsContent>
        <TabsContent value="addresses" className="pt-4 text-ink-muted">
          Addresses.
        </TabsContent>
        <TabsContent value="wishlist" className="pt-4 text-ink-muted">
          Wishlist.
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function LoadingButtonDemo() {
  const [loading, setLoading] = React.useState(false);

  function run() {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1600);
  }

  return (
    <Button loading={loading} onClick={run}>
      Add to bag
    </Button>
  );
}

export function RetryErrorDemo() {
  const [attempt, setAttempt] = React.useState(0);
  return (
    <InlineError
      title="We couldn't load delivery estimates"
      description="Check your connection and try again. You can still add this piece to your bag."
      action={
        <Button variant="secondary" size="sm" onClick={() => setAttempt((n) => n + 1)}>
          <RefreshCwIcon aria-hidden="true" />
          Retry{attempt > 0 ? ` (${attempt})` : ""}
        </Button>
      }
    />
  );
}
