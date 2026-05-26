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

  const cartQuery = useQuery({
    queryKey: ["cart", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CartRow[]> => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, product_id, quantity, product:products(id,name,price,image_url,category)")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as CartRow[];
    },
  });

  const add = useMutation({
    mutationFn: async ({ productId, qty = 1 }: { productId: string; qty?: number }) => {
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
