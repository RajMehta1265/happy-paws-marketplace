import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { dbService, Pet, parseImages } from "@/services/db-service";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FiUsers,
  FiPackage,
  FiCalendar,
  FiTrendingUp,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPlay,
  FiImage,
  FiCheckCircle,
  FiGrid,
  FiX,
  FiUploadCloud
} from "react-icons/fi";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Portal — WOOLF.INDIA" }] }),
  component: AdminPage,
});

const PRESETS = {
  dogImage: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800",
  catImage: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800",
  dogVideo: "https://assets.mixkit.co/videos/preview/mixkit-golden-retriever-puppy-sitting-on-grass-32860-large.mp4",
  catVideo: "https://assets.mixkit.co/videos/preview/mixkit-cat-resting-on-a-cushion-41484-large.mp4",
  productImage: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=800"
};

const BREED_PRESETS: Record<string, string[]> = {
  Dog: ["Labrador", "Golden Retriever", "Beagle", "German Shepherd", "Poodle", "Husky", "Pug", "Shih Tzu"],
  Cat: ["Persian", "Siamese", "Maine Coon", "Bengal", "Ragdoll", "British Shorthair"],
  Rabbit: ["Holland Lop", "Mini Rex", "Netherland Dwarf", "Flemish Giant"],
  Bird: ["Budgerigar", "Cockatiel", "Scarlet Macaw", "Lovebird", "Canary"],
  Hamster: ["Syrian", "Dwarf Campbell", "Roborovski"],
  Exotic: ["Veiled Chameleon", "Sugar Glider", "Red-Eyed Tree Frog", "Bearded Dragon", "Axolotl"]
};

function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "pets" | "exotics" | "products">("pets");
  
  // Companion CRUD states
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Companion Form State
  const [formData, setFormData] = useState({
    name: "",
    type: "Dog",
    breed: "",
    age: "",
    price: 0,
    image_url: "",
    video_url: "",
    vaccinated: false,
    adoption: false,
    status: "available",
    description: ""
  });

  // Shop Item CRUD states
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Shop Item Form State
  const [productFormData, setProductFormData] = useState({
    name: "",
    category: "Food",
    price: 0,
    image_url: "",
    description: "",
    stock: 10,
    rating: 5.0
  });

  // Guard routing
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate({ to: "/login" });
      } else if (!isAdmin) {
        toast.error("Access denied. Admin role required.");
        navigate({ to: "/dashboard" });
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Handle local file uploads and convert to Base64 data URLs
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, formType: "pet" | "product") => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 3 * 1024 * 1024) {
      toast.warning("File is larger than 3MB. High resolution images may affect database sync and load speeds.");
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (formType === "product") {
        setProductFormData(prev => ({ ...prev, image_url: base64String }));
      } else {
        setFormData(prev => ({ ...prev, image_url: base64String }));
      }
      toast.success("Image successfully loaded from computer!");
    };
    reader.readAsDataURL(file);
  };

  const handleMultipleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentImages = parseImages(formData.image_url);
    const newImages: string[] = [...currentImages];
    let loadedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 3 * 1024 * 1024) {
        toast.warning(`${file.name} is larger than 3MB. High resolution images may affect database sync and load speeds.`);
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        newImages.push(base64String);
        loadedCount++;
        if (loadedCount === files.length) {
          setFormData(prev => ({ ...prev, image_url: JSON.stringify(newImages) }));
          toast.success(`Successfully loaded ${files.length} image(s) from computer!`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 15 * 1024 * 1024) {
      toast.warning("File is larger than 15MB. Storing large video files directly in the database may affect database sync and load speeds.");
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData(prev => ({ ...prev, video_url: base64String }));
      toast.success("Video successfully loaded from computer!");
    };
    reader.readAsDataURL(file);
  };

  // Fetch real statistics from database
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const isMock = !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        const storedOrders = localStorage.getItem("pawhaven_orders") || "[]";
        let localOrders = [];
        try { localOrders = JSON.parse(storedOrders); } catch {}
        const localRev = localOrders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
        
        let localUserCount = 1;
        try {
          localUserCount = Object.keys(localStorage).filter(k => k.startsWith("pawhaven_profile_")).length || 1;
        } catch {}

        const localPetCount = dbService.initLocalData().length;

        return [
          { label: "Total Users", value: String(localUserCount), icon: FiUsers },
          { label: "Total Orders", value: String(localOrders.length), icon: FiPackage },
          { label: "Total Companions", value: String(localPetCount), icon: FiCalendar },
          { label: "Total Revenue", value: `₹${localRev.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: FiTrendingUp },
        ];
      }

      // Real Supabase counts
      try {
        const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        const { data: ordersData } = await supabase.from("orders").select("total");
        const { count: petCount } = await supabase.from("pets").select("*", { count: "exact", head: true });

        const orderCount = ordersData?.length ?? 0;
        const totalRevenue = ordersData?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0;

        return [
          { label: "Total Users", value: String(userCount ?? 0), icon: FiUsers },
          { label: "Total Orders", value: String(orderCount), icon: FiPackage },
          { label: "Total Companions", value: String(petCount ?? 0), icon: FiCalendar },
          { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: FiTrendingUp },
        ];
      } catch (err) {
        console.warn("Failed to fetch real database statistics:", err);
        return [
          { label: "Total Users", value: "0", icon: FiUsers },
          { label: "Total Orders", value: "0", icon: FiPackage },
          { label: "Total Companions", value: "0", icon: FiCalendar },
          { label: "Total Revenue", value: "₹0", icon: FiTrendingUp },
        ];
      }
    }
  });

  // Fetch companions (pets)
  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => dbService.getPets(),
    initialData: () => dbService.initLocalData(),
  });

  // Fetch products (shop items)
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const isMock = !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        const stored = localStorage.getItem("pawhaven_products");
        if (stored) {
          try { return JSON.parse(stored); } catch {}
        }
        const { products: sampleProducts } = await import("@/data/sample");
        const list = sampleProducts.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          image_url: p.image || null,
          rating: p.rating,
          description: "Curated premium care product by WOOLF.INDIA",
          stock: 10
        }));
        localStorage.setItem("pawhaven_products", JSON.stringify(list));
        return list;
      }

      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Pet CRUD Handlers
  const handleEditClick = (pet: Pet) => {
    setEditingPet(pet);
    setIsAdding(false);
    setFormData({
      name: pet.name,
      type: pet.type,
      breed: pet.breed || "",
      age: pet.age || "",
      price: pet.price,
      image_url: pet.image_url || "",
      video_url: pet.video_url || "",
      vaccinated: pet.vaccinated,
      adoption: pet.adoption,
      status: pet.status,
      description: pet.description || ""
    });
  };

  const handleAddClick = (isExotic: boolean) => {
    setIsAdding(true);
    setEditingPet(null);
    setFormData({
      name: "",
      type: isExotic ? "Exotic" : "Dog",
      breed: "",
      age: "",
      price: 0,
      image_url: "",
      video_url: "",
      vaccinated: false,
      adoption: false,
      status: "available",
      description: ""
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Pet Name is required");
    if (!formData.image_url.trim()) return toast.error("Image is required. Please upload or specify a URL.");

    const payload = {
      name: formData.name.trim(),
      type: formData.type,
      breed: formData.breed.trim() || "Mixed",
      age: formData.age.trim() || "Unknown",
      price: formData.adoption ? 0 : Number(formData.price),
      image_url: formData.image_url.trim(),
      video_url: formData.video_url.trim() || null,
      vaccinated: formData.vaccinated,
      adoption: formData.adoption,
      status: formData.status,
      description: formData.description.trim()
    };

    try {
      if (editingPet) {
        await dbService.updatePet(editingPet.id, payload);
        toast.success(`Successfully updated ${payload.name}!`);
      } else {
        await dbService.createPet(payload);
        toast.success(`Successfully added ${payload.name} to the database!`);
      }
      qc.invalidateQueries({ queryKey: ["pets"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
      setIsAdding(false);
      setEditingPet(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDeletePet = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await dbService.deletePet(id);
      toast.success(`${name} deleted successfully`);
      qc.invalidateQueries({ queryKey: ["pets"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const autofillPreset = (key: keyof typeof PRESETS) => {
    setFormData(prev => ({
      ...prev,
      image_url: key === "dogImage" || key === "catImage" ? PRESETS[key] : prev.image_url,
      video_url: key === "dogVideo" || key === "catVideo" ? PRESETS[key] : prev.video_url
    }));
    toast.info("Autofilled preset URL!");
  };

  // Product CRUD Handlers
  const handleEditProductClick = (prod: any) => {
    setEditingProduct(prod);
    setIsAddingProduct(false);
    setProductFormData({
      name: prod.name,
      category: prod.category || "Food",
      price: Number(prod.price),
      image_url: prod.image_url || "",
      description: prod.description || "",
      stock: prod.stock ?? 10,
      rating: Number(prod.rating ?? 5.0)
    });
  };

  const handleAddProductClick = () => {
    setIsAddingProduct(true);
    setEditingProduct(null);
    setProductFormData({
      name: "",
      category: "Food",
      price: 0,
      image_url: "",
      description: "",
      stock: 10,
      rating: 5.0
    });
  };

  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productFormData.name.trim()) return toast.error("Product Name is required");
    if (!productFormData.image_url.trim()) return toast.error("Image is required. Please upload or specify a URL.");

    const payload = {
      name: productFormData.name.trim(),
      category: productFormData.category,
      price: Number(productFormData.price),
      image_url: productFormData.image_url.trim(),
      description: productFormData.description.trim(),
      stock: Number(productFormData.stock),
      rating: Number(productFormData.rating)
    };

    const isMock = !!localStorage.getItem("pawhaven_mock_session");
    try {
      if (isMock) {
        const stored = localStorage.getItem("pawhaven_products") || "[]";
        let localProds = [];
        try { localProds = JSON.parse(stored); } catch {}

        if (editingProduct) {
          const index = localProds.findIndex((p: any) => p.id === editingProduct.id);
          if (index !== -1) {
            localProds[index] = { ...localProds[index], ...payload };
          }
          toast.success(`Successfully updated ${payload.name} (locally)!`);
        } else {
          localProds.push({ id: crypto.randomUUID(), ...payload });
          toast.success(`Successfully added ${payload.name} (locally)!`);
        }
        localStorage.setItem("pawhaven_products", JSON.stringify(localProds));
      } else {
        if (editingProduct) {
          const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
          if (error) throw error;
          toast.success(`Successfully updated ${payload.name}!`);
        } else {
          const { error } = await supabase.from("products").insert([payload]);
          if (error) throw error;
          toast.success(`Successfully added ${payload.name}!`);
        }
      }
      qc.invalidateQueries({ queryKey: ["products"] });
      setIsAddingProduct(false);
      setEditingProduct(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    const isMock = !!localStorage.getItem("pawhaven_mock_session");
    try {
      if (isMock) {
        const stored = localStorage.getItem("pawhaven_products") || "[]";
        let localProds = [];
        try { localProds = JSON.parse(stored); } catch {}
        localProds = localProds.filter((p: any) => p.id !== id);
        localStorage.setItem("pawhaven_products", JSON.stringify(localProds));
        toast.success(`${name} deleted successfully (locally)`);
      } else {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
        toast.success(`${name} deleted successfully`);
      }
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const autofillProductPreset = () => {
    setProductFormData(prev => ({
      ...prev,
      image_url: PRESETS.productImage
    }));
    toast.info("Autofilled preset product image!");
  };

  // Lists filtering
  const standardPets = (pets ?? []).filter(p => p.type !== "Exotic");
  const exoticPets = (pets ?? []).filter(p => p.type === "Exotic");

  if (authLoading || !user || !isAdmin) {
    return (
      <SiteLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground mt-4 font-medium">Checking admin privileges...</p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="text-xs uppercase tracking-[0.25em] text-accent">Management System</div>
        <h1 className="mt-2 font-display text-5xl">Admin Portal</h1>

        {/* Tab Controls */}
        <div className="mt-8 flex border-b border-border gap-6 overflow-x-auto">
          <button
            onClick={() => { setActiveTab("overview"); setIsAdding(false); setEditingPet(null); }}
            className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "overview"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview & Stats
          </button>
          <button
            onClick={() => { setActiveTab("pets"); setIsAdding(false); setEditingPet(null); }}
            className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "pets"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Manage Pets (Companions)
          </button>
          <button
            onClick={() => { setActiveTab("exotics"); setIsAdding(false); setEditingPet(null); }}
            className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "exotics"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Manage Exotics (Rare Species)
          </button>
          <button
            onClick={() => { setActiveTab("products"); setIsAddingProduct(false); setEditingProduct(null); }}
            className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "products"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Manage Shop Items (Products)
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="mt-8 space-y-8 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-3xl bg-card border border-border p-6 shadow-sm animate-pulse h-[120px]" />
                ))
              ) : (
                stats?.map((s) => (
                  <div key={s.label} className="rounded-3xl bg-card border border-border p-6 shadow-sm hover:shadow-md transition">
                    <s.icon className="text-accent" size={22} />
                    <div className="mt-3 font-display text-3xl">{s.value}</div>
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                  </div>
                ))
              )}
            </div>

            {/* Chart Widget */}
            <div className="rounded-3xl bg-card border border-border p-7 shadow-sm">
              <h3 className="font-display text-2xl mb-4">Monthly Analytics</h3>
              <div className="flex items-end gap-2 h-44">
                {[40, 65, 30, 80, 55, 90, 70, 95, 60, 75, 85, 100].map((v, i) => (
                  <div key={i} className="flex-1 rounded-t-lg bg-primary/80 hover:bg-accent transition" style={{ height: `${v}%` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Standard Pets CRUD */}
        {activeTab === "pets" && (
          <div className="mt-8 space-y-8 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-display text-3xl">Pets Database</h2>
                <p className="text-sm text-muted-foreground">Add, update, or remove standard pets (Dogs, Cats, Rabbits, etc.) in the active system catalog.</p>
              </div>
              {!isAdding && !editingPet && (
                <button
                  onClick={() => handleAddClick(false)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground font-semibold hover:opacity-90 transition cursor-pointer"
                >
                  <FiPlus /> Add New Companion
                </button>
              )}
            </div>

            {/* Pet Form */}
            {(isAdding || (editingPet && formData.type !== "Exotic")) && (
              <div className="rounded-3xl bg-card border-2 border-accent/20 p-8 shadow-md relative animate-slide-down">
                <button onClick={() => { setIsAdding(false); setEditingPet(null); }}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground transition cursor-pointer"
                >
                  <FiX size={20} />
                </button>

                <h3 className="font-display text-2xl mb-6">
                  {editingPet ? `Modify Companion Profile: ${editingPet.name}` : "Register New Companion Pet"}
                </h3>

                <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Pet Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Max, Bella"
                        className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Pet Type</label>
                        <select
                          className="rounded-full border border-input bg-background px-4 py-3 text-sm focus:outline-primary"
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value, breed: "" })}
                        >
                          <option value="Dog">Dog</option>
                          <option value="Cat">Cat</option>
                          <option value="Rabbit">Rabbit</option>
                          <option value="Bird">Bird</option>
                          <option value="Hamster">Hamster</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Breed</label>
                        <input
                          type="text"
                          placeholder="e.g. Persian, Beagle"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={formData.breed}
                          onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                          list="breed-options"
                        />
                        <datalist id="breed-options">
                          {(BREED_PRESETS[formData.type] || []).map((b) => (
                            <option key={b} value={b} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Age</label>
                        <input
                          type="text"
                          placeholder="e.g. 3 months, 2 years"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Price (₹) *</label>
                        <input
                          required
                          type="number"
                          min={0}
                          placeholder="e.g. 45000"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded text-primary h-4 w-4 border-input focus:ring-primary"
                          checked={formData.vaccinated}
                          onChange={(e) => setFormData({ ...formData, vaccinated: e.target.checked })}
                        />
                        <span>Vaccinated</span>
                      </label>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Availability Status</label>
                      <select
                        className="rounded-full border border-input bg-background px-4 py-3 text-sm focus:outline-primary"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="available">Available</option>
                        <option value="adopted">Adopted</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Image *</label>
                      <div className="flex gap-2">
                        <input
                          required
                          type="text"
                          placeholder="Image URL"
                          className="flex-1 rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={
                            formData.image_url.trim().startsWith("[")
                              ? `${parseImages(formData.image_url).length} images selected`
                              : formData.image_url.startsWith("data:")
                              ? "Image loaded from computer"
                              : formData.image_url
                          }
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        />
                        <label className="rounded-full bg-primary/10 border border-primary/20 px-5 py-3 text-sm text-primary hover:bg-primary/20 transition cursor-pointer flex items-center gap-2 whitespace-nowrap font-medium">
                          <FiUploadCloud /> Upload from PC
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleMultipleImagesUpload}
                          />
                        </label>
                      </div>

                      {/* Thumbnail Previews */}
                      {parseImages(formData.image_url).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 p-3 bg-muted/40 rounded-2xl border border-border">
                          {parseImages(formData.image_url).map((url, idx) => (
                            <div key={idx} className="relative w-16 h-16 group rounded-lg overflow-hidden border border-border bg-background">
                              <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = parseImages(formData.image_url).filter((_, i) => i !== idx);
                                  setFormData(prev => ({
                                    ...prev,
                                    image_url: updated.length === 1 ? updated[0] : (updated.length > 1 ? JSON.stringify(updated) : "")
                                  }));
                                }}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md hover:scale-105 transition cursor-pointer flex items-center justify-center"
                              >
                                <FiX size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => autofillPreset(formData.type === "Cat" ? "catImage" : "dogImage")}
                          className="text-[10px] bg-muted hover:bg-border px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                        >
                          <FiImage size={10} /> Use preset {formData.type === "Cat" ? "Cat" : "Dog"} image
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Video URL (Optional)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Video stream MP4 link or upload below"
                          className="flex-1 rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={formData.video_url?.startsWith("data:") ? "Video loaded from computer" : formData.video_url || ""}
                          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                        />
                        <label className="rounded-full bg-primary/10 border border-primary/20 px-5 py-3 text-sm text-primary hover:bg-primary/20 transition cursor-pointer flex items-center gap-2 whitespace-nowrap font-medium">
                          <FiUploadCloud /> Upload from PC
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={handleVideoUpload}
                          />
                        </label>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => autofillPreset(formData.type === "Cat" ? "catVideo" : "dogVideo")}
                          className="text-[10px] bg-muted hover:bg-border px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                        >
                          <FiPlay size={10} /> Use preset video stream
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Description</label>
                      <textarea
                        rows={4}
                        placeholder="Provide details about the companion's behavior, training, etc."
                        className="rounded-2xl border border-input bg-background px-5 py-3 text-sm focus:outline-primary resize-none"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 pt-4 border-t border-border/60 flex justify-end gap-3">
                    <button type="button" onClick={() => { setIsAdding(false); setEditingPet(null); }}
                      className="rounded-full border border-border bg-background px-6 py-2.5 text-sm hover:bg-muted transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button type="submit"
                      className="rounded-full bg-primary px-7 py-2.5 text-sm text-primary-foreground font-semibold hover:opacity-90 transition cursor-pointer"
                    >
                      {editingPet ? "Update profile" : "Save profile"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Pets Table */}
            <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-muted/40">
                <h3 className="font-display text-2xl font-semibold">Active Companions List</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/10 text-muted-foreground text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Pet</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Breed</th>
                      <th className="px-6 py-4">Pricing</th>
                      <th className="px-6 py-4">Vaccinated</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {petsLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground animate-pulse">
                          Loading companions catalog...
                        </td>
                      </tr>
                    ) : standardPets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                          No companions found. Click Add to register one.
                        </td>
                      </tr>
                    ) : (
                      standardPets.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition">
                          <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                            <img
                              src={parseImages(p.image_url)[0] || "/pet-1.jpg"}
                              alt={p.name}
                              className="h-10 w-10 rounded-full object-cover border border-border bg-muted"
                            />
                            <div>
                              <div className="font-semibold">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{p.age}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">{p.type}</td>
                          <td className="px-6 py-4">{p.breed}</td>
                          <td className="px-6 py-4">
                            <span className="font-display font-medium text-accent-foreground">
                              ₹{p.price}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {p.vaccinated ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                                <FiCheckCircle /> Yes
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${p.status === "available" ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleEditClick(p)} className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer" title="Edit companion details">
                                <FiEdit2 size={14} />
                              </button>
                              <button onClick={() => handleDeletePet(p.id, p.name)} className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition cursor-pointer" title="Delete companion from catalog">
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Exotic Pets CRUD */}
        {activeTab === "exotics" && (
          <div className="mt-8 space-y-8 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-display text-3xl">Exotic Pets Database</h2>
                <p className="text-sm text-muted-foreground">Add, update, or remove rare and ethically-sourced exotic pets in the catalog.</p>
              </div>
              {!isAdding && !editingPet && (
                <button
                  onClick={() => handleAddClick(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground font-semibold hover:opacity-90 transition cursor-pointer animate-pulse"
                >
                  <FiPlus /> Add New Exotic Pet
                </button>
              )}
            </div>

            {/* Exotic Pet Form */}
            {(isAdding || (editingPet && formData.type === "Exotic")) && (
              <div className="rounded-3xl bg-card border-2 border-amber-500/20 p-8 shadow-md relative animate-slide-down">
                <button onClick={() => { setIsAdding(false); setEditingPet(null); }}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground transition cursor-pointer"
                >
                  <FiX size={20} />
                </button>

                <h3 className="font-display text-2xl mb-6 text-amber-950">
                  {editingPet ? `Modify Exotic Profile: ${editingPet.name}` : "Register New Exotic Pet / Species"}
                </h3>

                <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Exotic Pet Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Major, Ziggy"
                        className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Classification / Type</label>
                        <input
                          disabled
                          type="text"
                          className="rounded-full border border-input bg-muted px-5 py-3 text-sm text-muted-foreground"
                          value="Exotic"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Species / Breed *</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Scarlet Macaw, Chameleon"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={formData.breed}
                          onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                          list="exotic-breeds"
                        />
                        <datalist id="exotic-breeds">
                          {BREED_PRESETS.Exotic.map((b) => (
                            <option key={b} value={b} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Age / Lifespan</label>
                        <input
                          type="text"
                          placeholder="e.g. 6 months, 3 years"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Price (₹) *</label>
                        <input
                          required
                          type="number"
                          min={0}
                          placeholder="e.g. 120000"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded text-primary h-4 w-4 border-input focus:ring-primary"
                          checked={formData.vaccinated}
                          onChange={(e) => setFormData({ ...formData, vaccinated: e.target.checked })}
                        />
                        <span>Health Certified & Vaccinated</span>
                      </label>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Availability Status</label>
                      <select
                        className="rounded-full border border-input bg-background px-4 py-3 text-sm focus:outline-primary"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="available">Available</option>
                        <option value="adopted">Adopted / Rehomed</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Image *</label>
                      <div className="flex gap-2">
                        <input
                          required
                          type="text"
                          placeholder="Image URL"
                          className="flex-1 rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={
                            formData.image_url.trim().startsWith("[")
                              ? `${parseImages(formData.image_url).length} images selected`
                              : formData.image_url.startsWith("data:")
                              ? "Image loaded from computer"
                              : formData.image_url
                          }
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        />
                        <label className="rounded-full bg-primary/10 border border-primary/20 px-5 py-3 text-sm text-primary hover:bg-primary/20 transition cursor-pointer flex items-center gap-2 whitespace-nowrap font-medium">
                          <FiUploadCloud /> Upload from PC
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleMultipleImagesUpload}
                          />
                        </label>
                      </div>

                      {/* Thumbnail Previews */}
                      {parseImages(formData.image_url).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 p-3 bg-muted/40 rounded-2xl border border-border">
                          {parseImages(formData.image_url).map((url, idx) => (
                            <div key={idx} className="relative w-16 h-16 group rounded-lg overflow-hidden border border-border bg-background">
                              <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = parseImages(formData.image_url).filter((_, i) => i !== idx);
                                  setFormData(prev => ({
                                    ...prev,
                                    image_url: updated.length === 1 ? updated[0] : (updated.length > 1 ? JSON.stringify(updated) : "")
                                  }));
                                }}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md hover:scale-105 transition cursor-pointer flex items-center justify-center"
                              >
                                <FiX size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Enclosure / Video Stream (Optional)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Video stream MP4 link or upload below"
                          className="flex-1 rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={formData.video_url?.startsWith("data:") ? "Video loaded from computer" : formData.video_url || ""}
                          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                        />
                        <label className="rounded-full bg-primary/10 border border-primary/20 px-5 py-3 text-sm text-primary hover:bg-primary/20 transition cursor-pointer flex items-center gap-2 whitespace-nowrap font-medium">
                          <FiUploadCloud /> Upload from PC
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={handleVideoUpload}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Description & Ethological Requirements</label>
                      <textarea
                        rows={4}
                        placeholder="Detail the specialized lighting, temperature, feed, and behavior habits..."
                        className="rounded-2xl border border-input bg-background px-5 py-3 text-sm focus:outline-primary resize-none"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 pt-4 border-t border-border/60 flex justify-end gap-3">
                    <button type="button" onClick={() => { setIsAdding(false); setEditingPet(null); }}
                      className="rounded-full border border-border bg-background px-6 py-2.5 text-sm hover:bg-muted transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button type="submit"
                      className="rounded-full bg-primary px-7 py-2.5 text-sm text-primary-foreground font-semibold hover:opacity-90 transition cursor-pointer"
                    >
                      {editingPet ? "Update profile" : "Save profile"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Exotics Table */}
            <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-muted/40">
                <h3 className="font-display text-2xl font-semibold">Active Exotic Species List</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/10 text-muted-foreground text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Exotic</th>
                      <th className="px-6 py-4">Species</th>
                      <th className="px-6 py-4">Pricing</th>
                      <th className="px-6 py-4">Certified</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {petsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground animate-pulse">
                          Loading exotic pets catalog...
                        </td>
                      </tr>
                    ) : exoticPets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                          No exotic species listed. Click Add to register one.
                        </td>
                      </tr>
                    ) : (
                      exoticPets.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition">
                          <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                            <img
                              src={parseImages(p.image_url)[0] || "/pet-1.jpg"}
                              alt={p.name}
                              className="h-10 w-10 rounded-full object-cover border border-border bg-muted"
                            />
                            <div>
                              <div className="font-semibold text-amber-900">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{p.age}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">{p.breed}</td>
                          <td className="px-6 py-4 font-display font-medium text-accent-foreground">₹{Number(p.price).toLocaleString()}</td>
                          <td className="px-6 py-4">
                            {p.vaccinated ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                <FiCheckCircle /> Certified
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Pending</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${p.status === "available" ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleEditClick(p)} className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer font-medium" title="Edit companion details">
                                <FiEdit2 size={14} />
                              </button>
                              <button onClick={() => handleDeletePet(p.id, p.name)} className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition cursor-pointer" title="Delete companion from catalog">
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Products CRUD */}
        {activeTab === "products" && (
          <div className="mt-8 space-y-8 animate-fade-in">
            {/* Action Bar */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-display text-3xl">Shop Products Database</h2>
                <p className="text-sm text-muted-foreground">Add, update, or remove pet care products in the shop catalog.</p>
              </div>
              {!isAddingProduct && !editingProduct && (
                <button
                  onClick={handleAddProductClick}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground font-semibold hover:opacity-90 transition cursor-pointer"
                >
                  <FiPlus /> Add New Shop Item
                </button>
              )}
            </div>

            {/* Add / Edit Product Form Card */}
            {(isAddingProduct || editingProduct) && (
              <div className="rounded-3xl bg-card border-2 border-accent/20 p-8 shadow-md relative animate-slide-down">
                <button
                  onClick={() => {
                    setIsAddingProduct(false);
                    setEditingProduct(null);
                  }}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground transition cursor-pointer"
                >
                  <FiX size={20} />
                </button>

                <h3 className="font-display text-2xl mb-6">
                  {editingProduct ? `Modify Shop Item: ${editingProduct.name}` : "Add New Shop Item"}
                </h3>

                <form onSubmit={handleProductFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Product Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Grain-Free Kibble, Wool Bed"
                        className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                        value={productFormData.name}
                        onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Category</label>
                        <select
                          className="rounded-full border border-input bg-background px-4 py-3 text-sm focus:outline-primary"
                          value={productFormData.category}
                          onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                        >
                          <option value="Food">Food</option>
                          <option value="Toys">Toys</option>
                          <option value="Grooming">Grooming</option>
                          <option value="Accessories">Accessories</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Price (₹) *</label>
                        <input
                          required
                          type="number"
                          min={0}
                          placeholder="e.g. 1500"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={productFormData.price}
                          onChange={(e) => setProductFormData({ ...productFormData, price: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Rating (0 - 5) *</label>
                        <input
                          required
                          type="number"
                          step="0.1"
                          min={0}
                          max={5}
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={productFormData.rating}
                          onChange={(e) => setProductFormData({ ...productFormData, rating: Number(e.target.value) })}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Stock *</label>
                        <input
                          required
                          type="number"
                          min={0}
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={productFormData.stock}
                          onChange={(e) => setProductFormData({ ...productFormData, stock: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Image *</label>
                      <div className="flex gap-2">
                        <input
                          required
                          type="text"
                          placeholder="Image URL"
                          className="flex-1 rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={productFormData.image_url.startsWith("data:") ? "Image loaded from computer" : productFormData.image_url}
                          onChange={(e) => setProductFormData({ ...productFormData, image_url: e.target.value })}
                        />
                        <label className="rounded-full bg-primary/10 border border-primary/20 px-5 py-3 text-sm text-primary hover:bg-primary/20 transition cursor-pointer flex items-center gap-2 whitespace-nowrap font-medium">
                          <FiUploadCloud /> Upload from PC
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, "product")}
                          />
                        </label>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={autofillProductPreset}
                          className="text-[10px] bg-muted hover:bg-border px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                        >
                          <FiImage size={10} /> Use preset product image
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Description</label>
                      <textarea
                        rows={4}
                        placeholder="Provide details about the product's benefits, ingredients, dimensions, etc."
                        className="rounded-2xl border border-input bg-background px-5 py-3 text-sm focus:outline-primary resize-none"
                        value={productFormData.description}
                        onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 pt-4 border-t border-border/60 flex justify-end gap-3">
                    <button type="button" onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
                      className="rounded-full border border-border bg-background px-6 py-2.5 text-sm hover:bg-muted transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button type="submit"
                      className="rounded-full bg-primary px-7 py-2.5 text-sm text-primary-foreground font-semibold hover:opacity-90 transition cursor-pointer"
                    >
                      {editingProduct ? "Update item" : "Save item"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Products List Table */}
            <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-muted/40">
                <h3 className="font-display text-2xl font-semibold">Active Products List</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/10 text-muted-foreground text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Item</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Stock</th>
                      <th className="px-6 py-4">Rating</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {productsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground animate-pulse">
                          Loading products catalog...
                        </td>
                      </tr>
                    ) : productsData?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                          No products found in catalog. Click Add to create one.
                        </td>
                      </tr>
                    ) : (
                      productsData?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition">
                          <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                            <img
                              src={p.image_url.startsWith("data:") ? p.image_url : p.image_url || "/product-1.jpg"}
                              alt={p.name}
                              className="h-10 w-10 rounded-full object-cover border border-border bg-muted"
                            />
                            <div>
                              <div className="font-semibold">{p.name}</div>
                              <div className="text-xs text-muted-foreground max-w-[250px] truncate">{p.description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">{p.category}</td>
                          <td className="px-6 py-4 font-display font-medium text-accent-foreground font-semibold">₹{Number(p.price).toFixed(0)}</td>
                          <td className="px-6 py-4">{p.stock} units</td>
                          <td className="px-6 py-4">⭐ {Number(p.rating).toFixed(1)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleEditProductClick(p)} className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer font-medium" title="Edit product details">
                                <FiEdit2 size={14} />
                              </button>
                              <button onClick={() => handleDeleteProduct(p.id, p.name)} className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition cursor-pointer" title="Delete product from catalog">
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
