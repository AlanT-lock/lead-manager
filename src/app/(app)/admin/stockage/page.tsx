import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StockageClient } from "./StockageClient";

export default async function AdminStockagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "admin") {
    redirect("/admin");
  }

  const [productsRes, typesRes] = await Promise.all([
    adminClient
      .from("products")
      .select(`
        *,
        product_types (
          id,
          name,
          display_order
        )
      `)
      .order("name", { ascending: true }),
    adminClient
      .from("product_types")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const products = productsRes.data || [];
  const productTypes = typesRes.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Stockage</h1>
        <p className="text-slate-600 mt-1">
          Gestion du matériel et des produits. Créez des fiches produit et gérez les quantités en stock.
        </p>
      </div>

      <StockageClient
        initialProducts={products}
        initialProductTypes={productTypes}
      />
    </div>
  );
}
