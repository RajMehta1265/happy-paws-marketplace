import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";
import { sendEmail } from "@/services/mail-service";
import { mailTemplates } from "@/services/mail-templates";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — WOOLF.INDIA" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, total, setQty, remove, loading } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [placing, setPlacing] = useState(false);

  const checkout = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (items.length === 0) return;
    setPlacing(true);
    try {
      const isMock = !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        const storedOrders = localStorage.getItem("pawhaven_orders") || "[]";
        let localOrders = [];
        try {
          localOrders = JSON.parse(storedOrders);
        } catch {
          localOrders = [];
        }

        const newOrder = {
          id: crypto.randomUUID(),
          user_id: user.id,
          total,
          status: "paid",
          created_at: new Date().toISOString(),
          order_items: items.map((i) => ({
            id: crypto.randomUUID(),
            item_type: "product",
            item_id: i.product_id,
            name: i.product?.name ?? "",
            unit_price: i.product?.price ?? 0,
            quantity: i.quantity,
            image_url: i.product?.image_url ?? null,
          })),
        };

        localOrders.unshift(newOrder);
        localStorage.setItem("pawhaven_orders", JSON.stringify(localOrders));
        localStorage.setItem("pawhaven_cart", "[]");
        qc.invalidateQueries({ queryKey: ["cart"] });
        qc.invalidateQueries({ queryKey: ["orders", user.id] });

        // Send order confirmation email asynchronously
        try {
          let toName = user.email || "Valued Customer";
          let shippingAddress = {
            address_line: "",
            city: "",
            postal_code: "",
            country: "",
          };
          const storedProfile = localStorage.getItem(`pawhaven_profile_${user.id}`);
          if (storedProfile) {
            try {
              const parsed = JSON.parse(storedProfile);
              toName = parsed.full_name || toName;
              shippingAddress = {
                address_line: parsed.address_line || "",
                city: parsed.city || "",
                postal_code: parsed.postal_code || "",
                country: parsed.country || "",
              };
            } catch (err) {
              console.error("Failed to parse mock profile:", err);
            }
          }
          const orderReceiptHtml = mailTemplates.getOrderReceiptEmail({
            toName,
            orderId: newOrder.id,
            items: newOrder.order_items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unitPrice: i.unit_price,
              imageUrl: i.image_url ?? undefined,
            })),
            total: newOrder.total,
            shippingAddress,
          });
          sendEmail(
            user.email!,
            `Order Confirmation #${newOrder.id.slice(0, 8)}`,
            orderReceiptHtml,
          );
        } catch (emailErr) {
          console.error("Failed to prepare or send mock order receipt email:", emailErr);
        }

        toast.success("Order placed successfully!");
        navigate({ to: "/dashboard" });
        return;
      }

      const { data: order, error } = await supabase
        .from("orders")
        .insert({ user_id: user.id, total, status: "paid" })
        .select()
        .single();
      if (error) throw error;
      const rows = items.map((i) => ({
        order_id: order.id,
        item_type: "product" as const,
        item_id: i.product_id,
        name: i.product?.name ?? "",
        unit_price: i.product?.price ?? 0,
        quantity: i.quantity,
        image_url: i.product?.image_url ?? null,
      }));
      const { error: e2 } = await supabase.from("order_items").insert(rows);
      if (e2) throw e2;
      await supabase.from("cart_items").delete().eq("user_id", user.id);

      // Send order confirmation email asynchronously
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        const toName = profile?.full_name || user.email || "Valued Customer";
        const shippingAddress = {
          address_line: profile?.address_line || "",
          city: profile?.city || "",
          postal_code: profile?.postal_code || "",
          country: profile?.country || "",
        };

        const orderReceiptHtml = mailTemplates.getOrderReceiptEmail({
          toName,
          orderId: order.id,
          items: rows.map((r) => ({
            name: r.name,
            quantity: r.quantity,
            unitPrice: r.unit_price,
            imageUrl: r.image_url ?? undefined,
          })),
          total: order.total,
          shippingAddress,
        });

        sendEmail(user.email!, `Order Confirmation #${order.id.slice(0, 8)}`, orderReceiptHtml);
      } catch (emailErr) {
        console.error("Failed to prepare or send order receipt email:", emailErr);
      }

      toast.success("Order placed!");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPlacing(false);
    }
  };

  if (!user)
    return (
      <SiteLayout>
        <div className="mx-auto max-w-md px-6 py-32 text-center">
          <h1 className="font-display text-4xl">Sign in to view your cart</h1>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      </SiteLayout>
    );

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="font-display text-5xl">Your cart</h1>
        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-card border border-border p-12 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link to="/products" className="mt-4 inline-block text-accent">
              Browse the shop →
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid lg:grid-cols-[1fr_360px] gap-8">
            <ul className="space-y-4">
              {items.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center gap-4 rounded-2xl bg-card border border-border p-4"
                >
                  <img
                    src={i.product?.image_url ?? "/product-1.jpg"}
                    alt={i.product?.name}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <div className="font-display text-lg">{i.product?.name}</div>
                    <div className="text-xs text-muted-foreground">{i.product?.category}</div>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-2 py-1">
                      <button
                        onClick={() => setQty.mutate({ id: i.id, qty: i.quantity - 1 })}
                        className="p-1 hover:bg-muted rounded-full"
                      >
                        <FiMinus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm">{i.quantity}</span>
                      <button
                        onClick={() => setQty.mutate({ id: i.id, qty: i.quantity + 1 })}
                        className="p-1 hover:bg-muted rounded-full"
                      >
                        <FiPlus size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg text-accent">
                      ₹{((i.product?.price ?? 0) * i.quantity).toFixed(2)}
                    </div>
                    <button
                      onClick={() => remove.mutate(i.id)}
                      className="mt-2 text-muted-foreground hover:text-destructive"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <aside className="rounded-3xl bg-card border border-border p-6 h-fit">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground mt-1">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="border-t border-border my-4" />
              <div className="flex justify-between font-display text-xl">
                <span>Total</span>
                <span className="text-accent">₹{total.toFixed(2)}</span>
              </div>
              <button
                onClick={checkout}
                disabled={placing}
                className="mt-6 w-full rounded-full bg-primary px-6 py-3 text-primary-foreground disabled:opacity-60"
              >
                {placing ? "Placing order…" : "Checkout"}
              </button>
            </aside>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
