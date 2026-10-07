import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";

import { categoryOptions } from "../_category-options";
import { NewProductForm } from "./_form";

export default async function NewProductPage() {
  await requireAdmin("products:write");
  const categories = await categoryOptions();

  return (
    <div className="space-y-6">
      <PageHeader title="New product" back={{ href: "/admin/products/", label: "Products" }} />
      <NewProductForm categories={categories} />
    </div>
  );
}
