import { redirect } from "next/navigation";

/** The wishlist lives on the device for now; the account menu links to it directly. */
export default function AccountWishlistPage() {
  redirect("/wishlist/");
}
