import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export type CartRow = {
  id: string;
  product_id: string;
  quantity: number;
  product: { id: string; name: string; price: number; image_url: string | null; category: string } | null;
};

export function useCart() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const isMock = typeof window !== "undefined" && (!!localStorage.getItem("pawhaven_mock_session") || !user);

  const cartQuery = useQuery({
    queryKey: ["cart", user?.id],
    enabled: true,
    queryFn: async (): Promise<CartRow[]> => {
      if (isMock) {
        const stored = localStorage.getItem("pawhaven_cart") || "[]";
        let localItems = [];
        try {
          localItems = JSON.parse(stored);
        } catch {
          localItems = [];
        }
        
        let prods: any[] = [];
        const storedProds = localStorage.getItem("pawhaven_products");
        if (storedProds) {
          try { prods = JSON.parse(storedProds); } catch {}
        }

        if (prods.length === 0) {
          try {
            const { data } = await supabase.from("products").select("*");
            if (data && data.length > 0) prods = data;
          } catch {}
        }

        if (prods.length === 0) {
          const { products: sampleProducts } = await import("@/data/sample");
          prods = sampleProducts.map(p => ({ id: p.id, name: p.name, price: p.price, image_url: p.image, category: p.category }));
        }

        let pets: any[] = [];
        const storedPets = localStorage.getItem("pawhaven_pets");
        if (storedPets) {
          try { pets = JSON.parse(storedPets); } catch {}
        }

        return localItems.map((item: any) => {
          const p = prods.find((prod) => prod.id === item.product_id) || pets.find((pet) => pet.id === item.product_id);
          return {
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            product: p ? { id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url || null, category: p.category || "Pet" } : null
          };
        });
      }

      const { data, error } = await supabase
        .from("cart_items")
        .select("id, product_id, quantity")
        .order("created_at");
      if (error) throw error;

      const items = (data ?? []) as any[];
      if (items.length > 0) {
        const itemIds = items.map(item => item.product_id);
        try {
          // Fetch products and pets in parallel
          const [productsRes, petsRes] = await Promise.all([
            supabase.from("products").select("id, name, price, image_url, category").in("id", itemIds),
            supabase.from("pets").select("id, name, price, image_url").in("id", itemIds)
          ]);

          const prodsData = productsRes.data || [];
          const petsData = petsRes.data || [];

          items.forEach(item => {
            const prod = prodsData.find(p => p.id === item.product_id);
            const pet = petsData.find(p => p.id === item.product_id);

            if (prod) {
              item.product = {
                id: prod.id,
                name: prod.name,
                price: Number(prod.price),
                image_url: prod.image_url,
                category: prod.category
              };
            } else if (pet) {
              item.product = {
                id: pet.id,
                name: pet.name,
                price: Number(pet.price),
                image_url: pet.image_url,
                category: "Pet"
              };
            } else {
              item.product = null;
            }
          });
        } catch (err) {
          console.warn("Failed to resolve cart item details in parallel:", err);
        }
      }
      return items;
    },
  });

  const add = useMutation({
    mutationFn: async ({ productId, qty = 1 }: { productId: string; qty?: number }) => {
      if (isMock) {
        const stored = localStorage.getItem("pawhaven_cart") || "[]";
        let localItems = [];
        try {
          localItems = JSON.parse(stored);
        } catch {
          localItems = [];
        }
        
        const existingIndex = localItems.findIndex((c: any) => c.product_id === productId);
        if (existingIndex > -1) {
          localItems[existingIndex].quantity += qty;
        } else {
          localItems.push({ id: crypto.randomUUID(), product_id: productId, quantity: qty });
        }
        localStorage.setItem("pawhaven_cart", JSON.stringify(localItems));
        return;
      }

      if (!user) throw new Error("Please sign in to add items to your cart.");
      const existing = cartQuery.data?.find((c) => c.product_id === productId);
      if (existing) {
        const { error } = await supabase.from("cart_items").update({ quantity: existing.quantity + qty }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, quantity: qty });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cart"] }); toast.success("Added to cart"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setQty = useMutation({
    mutationFn: async ({ id, qty }: { id: string; qty: number }) => {
      if (isMock) {
        const stored = localStorage.getItem("pawhaven_cart") || "[]";
        let localItems = [];
        try {
          localItems = JSON.parse(stored);
        } catch {
          localItems = [];
        }

        if (qty <= 0) {
          localItems = localItems.filter((c: any) => c.id !== id);
        } else {
          const item = localItems.find((c: any) => c.id === id);
          if (item) item.quantity = qty;
        }
        localStorage.setItem("pawhaven_cart", JSON.stringify(localItems));
        return;
      }

      if (qty <= 0) {
        const { error } = await supabase.from("cart_items").delete().eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart_items").update({ quantity: qty }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (isMock) {
        const stored = localStorage.getItem("pawhaven_cart") || "[]";
        let localItems = [];
        try {
          localItems = JSON.parse(stored);
        } catch {
          localItems = [];
        }
        localItems = localItems.filter((c: any) => c.id !== id);
        localStorage.setItem("pawhaven_cart", JSON.stringify(localItems));
        return;
      }

      const { error } = await supabase.from("cart_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cart"] }); toast.success("Removed"); },
  });

  const items = cartQuery.data ?? [];
  const total = items.reduce((s, i) => s + (i.product?.price ?? 0) * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items, total, count, loading: cartQuery.isLoading, add, setQty, remove };
}
