import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { parseImages, dbService } from "@/services/db-service";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
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
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [shippingDetails, setShippingDetails] = useState({
    full_name: "",
    phone: "",
    address_line: "",
    city: "",
    postal_code: "",
    country: "India",
  });

  useEffect(() => {
    if (user) {
      const loadProfile = async () => {
        const isMock = !!localStorage.getItem("pawhaven_mock_session");
        if (isMock) {
          const stored = localStorage.getItem(`pawhaven_profile_${user.id}`);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setShippingDetails({
                full_name: parsed.full_name ?? "",
                phone: parsed.phone ?? "",
                address_line: parsed.address_line ?? "",
                city: parsed.city ?? "",
                postal_code: parsed.postal_code ?? "",
                country: parsed.country ?? "India",
              });
            } catch {}
          }
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (data) {
          setShippingDetails({
            full_name: data.full_name ?? "",
            phone: data.phone ?? "",
            address_line: data.address_line ?? "",
            city: data.city ?? "",
            postal_code: data.postal_code ?? "",
            country: data.country ?? "India",
          });
        }
      };
      loadProfile();
    }
  }, [user]);
  const [placing, setPlacing] = useState(false);
  const [signedName, setSignedName] = useState("");
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  const hasPet = items.some((i) => i.product?.category === "Pet");

  const checkout = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (items.length === 0) return;

    if (
      !shippingDetails.full_name.trim() ||
      !shippingDetails.phone.trim() ||
      !shippingDetails.address_line.trim() ||
      !shippingDetails.city.trim() ||
      !shippingDetails.postal_code.trim() ||
      !shippingDetails.country.trim()
    ) {
      toast.error("Please fill in all shipping details before placing the order.");
      return;
    }

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(shippingDetails.full_name.trim())) {
      toast.error("Full name must contain only letters and spaces.");
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(shippingDetails.phone.trim())) {
      toast.error("Phone number must be exactly 10 digits (numbers only).");
      return;
    }

    if (shippingDetails.country.trim().toLowerCase() === "india") {
      const pinRegex = /^\d{6}$/;
      if (!pinRegex.test(shippingDetails.postal_code.trim())) {
        toast.error("Postal code must be exactly 6 digits for India (numbers only).");
        return;
      }
    }

    if (hasPet) {
      if (!signedName.trim()) {
        toast.error("Please sign your full legal name for the Liability and Consent Basis.");
        return;
      }
      if (!liabilityAccepted || !consentGiven) {
        toast.error("Please accept the liability waiver and consent terms to proceed.");
        return;
      }
    }

    setPlacing(true);
    try {
      const isMock = !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        localStorage.setItem(`pawhaven_profile_${user.id}`, JSON.stringify(shippingDetails));

        // Update full name in mock session user_metadata
        const storedSession = localStorage.getItem("pawhaven_mock_session");
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession);
            parsed.user.user_metadata = {
              ...parsed.user.user_metadata,
              full_name: shippingDetails.full_name,
            };
            localStorage.setItem("pawhaven_mock_session", JSON.stringify(parsed));
          } catch {}
        }
        window.dispatchEvent(new Event("auth-change"));
        await refreshProfile();

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
          const toName = shippingDetails.full_name || user.email || "Valued Customer";
          const shippingAddress = {
            address_line: shippingDetails.address_line,
            city: shippingDetails.city,
            postal_code: shippingDetails.postal_code,
            country: shippingDetails.country,
          };
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
          if (user.email) {
            sendEmail(
              user.email,
              `Order Confirmation #${newOrder.id.slice(0, 8)}`,
              orderReceiptHtml,
            );
          }
        } catch (emailErr) {
          console.error("Failed to prepare or send mock order receipt email:", emailErr);
        }

        // Save consent records for any pets in the cart (mock flow)
        const petItems = items.filter((i) => i.product?.category === "Pet");
        for (const item of petItems) {
          await dbService.submitConsent({
            user_id: user.id,
            full_name: signedName.trim(),
            email: user.email || "customer@example.com",
            pet_id: item.product_id,
            pet_name: item.product?.name ?? "Unknown Pet",
            liability_accepted: liabilityAccepted,
            consent_given: consentGiven,
          });
        }

        toast.success("Order placed successfully!");
        navigate({ to: "/dashboard" });
        return;
      } else {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id,
          full_name: shippingDetails.full_name.trim(),
          phone: shippingDetails.phone.trim(),
          address_line: shippingDetails.address_line.trim(),
          city: shippingDetails.city.trim(),
          postal_code: shippingDetails.postal_code.trim(),
          country: shippingDetails.country.trim(),
          updated_at: new Date().toISOString(),
        });
        if (profileError) throw profileError;
        await refreshProfile();
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

      // Save consent records for any pets in the cart (Supabase flow)
      const petItems = items.filter((i) => i.product?.category === "Pet");
      for (const item of petItems) {
        await dbService.submitConsent({
          user_id: user.id,
          full_name: signedName.trim(),
          email: user.email || "customer@example.com",
          pet_id: item.product_id,
          pet_name: item.product?.name ?? "Unknown Pet",
          liability_accepted: liabilityAccepted,
          consent_given: consentGiven,
        });
      }

      // Send order confirmation email asynchronously
      try {
        const toName = shippingDetails.full_name || user.email || "Valued Customer";
        const shippingAddress = {
          address_line: shippingDetails.address_line,
          city: shippingDetails.city,
          postal_code: shippingDetails.postal_code,
          country: shippingDetails.country,
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

        if (user.email) {
          sendEmail(user.email, `Order Confirmation #${order.id.slice(0, 8)}`, orderReceiptHtml);
        }
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
            <div className="space-y-6">
              <ul className="space-y-4">
                {items.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center gap-4 rounded-2xl bg-card border border-border p-4"
                  >
                    <img
                      src={
                        parseImages(i.product?.image_url)[0] ||
                        i.product?.image_url ||
                        "/product-1.jpg"
                      }
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

              {/* Shipping Details form */}
              <div className="rounded-3xl bg-card border border-border p-8 shadow-soft">
                <h3 className="font-display text-2xl mb-1 text-foreground">Shipping Information</h3>
                <p className="text-xs text-muted-foreground mb-6">
                  Enter your contact and delivery details to place the order.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="John Doe"
                      value={shippingDetails.full_name}
                      onChange={(e) =>
                        setShippingDetails({
                          ...shippingDetails,
                          full_name: e.target.value.replace(/[^A-Za-z\s]/g, ""),
                        })
                      }
                      className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Phone Number *
                    </label>
                    <input
                      required
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit number"
                      value={shippingDetails.phone}
                      onChange={(e) =>
                        setShippingDetails({
                          ...shippingDetails,
                          phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                        })
                      }
                      className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Address Line *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Apartment, Street address"
                      value={shippingDetails.address_line}
                      onChange={(e) =>
                        setShippingDetails({ ...shippingDetails, address_line: e.target.value })
                      }
                      className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">City *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={shippingDetails.city}
                      onChange={(e) =>
                        setShippingDetails({ ...shippingDetails, city: e.target.value })
                      }
                      className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Postal Code *
                    </label>
                    <input
                      required
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 400001"
                      value={shippingDetails.postal_code}
                      onChange={(e) =>
                        setShippingDetails({
                          ...shippingDetails,
                          postal_code:
                            shippingDetails.country.toLowerCase() === "india"
                              ? e.target.value.replace(/\D/g, "").slice(0, 6)
                              : e.target.value.replace(/[^A-Za-z0-9\s-]/g, ""),
                        })
                      }
                      className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Country *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. India"
                      value={shippingDetails.country}
                      onChange={(e) =>
                        setShippingDetails({ ...shippingDetails, country: e.target.value })
                      }
                      className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
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

              {/* Liability & Consent Section */}
              {hasPet && (
                <div className="mt-6 border-t border-border pt-6 space-y-4">
                  <h4 className="font-display text-sm font-semibold text-foreground">
                    Liability & Consent Basis
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-2xl border border-border">
                    This order contains companion/exotic pets. By signing below, you agree to take
                    full responsibility for their welfare and legal ownership guidelines.
                  </p>

                  <div className="space-y-3">
                    <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded text-primary h-3.5 w-3.5 border-input mt-0.5 focus:ring-primary"
                        checked={liabilityAccepted}
                        onChange={(e) => setLiabilityAccepted(e.target.checked)}
                      />
                      <span>I accept the Liability Waiver.</span>
                    </label>

                    <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded text-primary h-3.5 w-3.5 border-input mt-0.5 focus:ring-primary"
                        checked={consentGiven}
                        onChange={(e) => setConsentGiven(e.target.checked)}
                      />
                      <span>I consent to the legal terms of ownership.</span>
                    </label>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Full Legal Name Signature
                    </label>
                    <input
                      type="text"
                      placeholder="Sign your full name"
                      className="w-full rounded-full border border-input bg-background px-4 py-2.5 text-xs focus:outline-primary font-medium"
                      value={signedName}
                      onChange={(e) => setSignedName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={checkout}
                disabled={
                  placing ||
                  !shippingDetails.full_name.trim() ||
                  !shippingDetails.phone.trim() ||
                  !shippingDetails.address_line.trim() ||
                  !shippingDetails.city.trim() ||
                  !shippingDetails.postal_code.trim() ||
                  !shippingDetails.country.trim() ||
                  (hasPet && (!signedName.trim() || !liabilityAccepted || !consentGiven))
                }
                className="mt-6 w-full rounded-full bg-primary px-6 py-3 text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed font-semibold text-sm transition hover:opacity-90 cursor-pointer"
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
