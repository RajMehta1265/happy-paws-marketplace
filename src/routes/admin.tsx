import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import {
  dbService,
  Pet,
  parseImages,
  type TrainingBooking,
  type HostellingBooking,
  type ContactSubmission,
} from "@/services/db-service";
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
  FiUploadCloud,
  FiFileText,
  FiPhoneCall,
  FiMail,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { BookingCalendar } from "@/components/BookingCalendar";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Portal — WOOLF.INDIA" }] }),
  component: AdminPage,
});

const PRESETS = {
  dogImage:
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800",
  catImage:
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800",
  dogVideo:
    "https://assets.mixkit.co/videos/preview/mixkit-golden-retriever-puppy-sitting-on-grass-32860-large.mp4",
  catVideo:
    "https://assets.mixkit.co/videos/preview/mixkit-cat-resting-on-a-cushion-41484-large.mp4",
  productImage:
    "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=800",
};

const BREED_PRESETS: Record<string, string[]> = {
  Dog: [
    "Labrador",
    "Golden Retriever",
    "Beagle",
    "German Shepherd",
    "Poodle",
    "Husky",
    "Pug",
    "Shih Tzu",
  ],
  Cat: ["Persian", "Siamese", "Maine Coon", "Bengal", "Ragdoll", "British Shorthair"],
  Rabbit: ["Holland Lop", "Mini Rex", "Netherland Dwarf", "Flemish Giant"],
  Bird: ["Budgerigar", "Cockatiel", "Scarlet Macaw", "Lovebird", "Canary"],
  Hamster: ["Syrian", "Dwarf Campbell", "Roborovski"],
  Exotic: ["Veiled Chameleon", "Sugar Glider", "Red-Eyed Tree Frog", "Bearded Dragon", "Axolotl"],
};

function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "pets"
    | "exotics"
    | "products"
    | "consent"
    | "consultations"
    | "bookings"
    | "contacts"
  >("pets");
  const [selectedConsent, setSelectedConsent] = useState<any | null>(null);

  const [bookingSubTab, setBookingSubTab] = useState<"training" | "hostelling">("training");
  const [editingTraining, setEditingTraining] = useState<TrainingBooking | null>(null);
  const [editingHostelling, setEditingHostelling] = useState<HostellingBooking | null>(null);

  // Training Bookings query
  const { data: trainingBookings = [], refetch: refetchTraining } = useQuery({
    queryKey: ["trainingBookings"],
    queryFn: () => dbService.getTrainingBookings(),
  });

  // Hostelling Bookings query
  const { data: hostellingBookings = [], refetch: refetchHostelling } = useQuery({
    queryKey: ["hostellingBookings"],
    queryFn: () => dbService.getHostellingBookings(),
  });

  const handleDeleteBooking = async (id: string) => {
    await dbService.deleteTrainingBooking(id);
    qc.invalidateQueries({ queryKey: ["trainingBookings"] });
    toast.success("Booking cancelled and slot freed.");
  };

  const handleDeleteHostelling = async (id: string) => {
    await dbService.deleteHostellingBooking(id);
    qc.invalidateQueries({ queryKey: ["hostellingBookings"] });
    toast.success("Hostelling stay record removed.");
  };

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
    description: "",
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
    rating: 5.0,
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

  // Automatically sync any local-only pets when admin portal mounts
  useEffect(() => {
    if (user && isAdmin) {
      dbService
        .syncLocalOnlyPets()
        .then(() => {
          qc.invalidateQueries({ queryKey: ["pets"] });
          qc.invalidateQueries({ queryKey: ["adminStats"] });
        })
        .catch((err) => {
          console.warn("Failed to automatically sync local-only pets:", err);
        });
    }
  }, [user, isAdmin, qc]);

  // Handle local file uploads and convert to Base64 data URLs
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    formType: "pet" | "product",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.warning(
        "File is larger than 3MB. High resolution images may affect database sync and load speeds.",
      );
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (formType === "product") {
        setProductFormData((prev) => ({ ...prev, image_url: base64String }));
      } else {
        setFormData((prev) => ({ ...prev, image_url: base64String }));
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
        toast.warning(
          `${file.name} is larger than 3MB. High resolution images may affect database sync and load speeds.`,
        );
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        newImages.push(base64String);
        loadedCount++;
        if (loadedCount === files.length) {
          setFormData((prev) => ({ ...prev, image_url: JSON.stringify(newImages) }));
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
      toast.warning(
        "File is larger than 15MB. Storing large video files directly in the database may affect database sync and load speeds.",
      );
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData((prev) => ({ ...prev, video_url: base64String }));
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
        try {
          localOrders = JSON.parse(storedOrders);
        } catch {}
        const localRev = localOrders.reduce((sum: number, o: any) => sum + Number(o.total), 0);

        let localUserCount = 1;
        try {
          localUserCount =
            Object.keys(localStorage).filter((k) => k.startsWith("pawhaven_profile_")).length || 1;
        } catch {}

        const localPetCount = dbService.initLocalData().length;

        return [
          { label: "Total Users", value: String(localUserCount), icon: FiUsers },
          { label: "Total Orders", value: String(localOrders.length), icon: FiPackage },
          { label: "Total Companions", value: String(localPetCount), icon: FiCalendar },
          {
            label: "Total Revenue",
            value: `₹${localRev.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: FiTrendingUp,
          },
        ];
      }

      // Real Supabase counts
      try {
        const { count: userCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });
        const { data: ordersData } = await supabase.from("orders").select("total");
        const { count: petCount } = await supabase
          .from("pets")
          .select("*", { count: "exact", head: true });

        const orderCount = ordersData?.length ?? 0;
        const totalRevenue = ordersData?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0;

        return [
          { label: "Total Users", value: String(userCount ?? 0), icon: FiUsers },
          { label: "Total Orders", value: String(orderCount), icon: FiPackage },
          { label: "Total Companions", value: String(petCount ?? 0), icon: FiCalendar },
          {
            label: "Total Revenue",
            value: `₹${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: FiTrendingUp,
          },
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
    },
  });

  // Fetch companions (pets)
  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => dbService.getPets(),
    initialData: () => dbService.initLocalData(),
  });

  // Dynamically compute companion pet types from data (excluding "Exotic")
  const dynamicCompanionTypes = useMemo(() => {
    const defaultTypes = ["Dog", "Cat", "Rabbit", "Bird", "Hamster"];
    if (!pets) return defaultTypes;
    const typesFromData = pets
      .filter((p) => p.type && p.type.toLowerCase() !== "exotic")
      .map((p) => p.type);
    const merged = [...defaultTypes];
    typesFromData.forEach((t) => {
      // Clean type casing (e.g. capitalize first letter)
      const formatted = t.trim().charAt(0).toUpperCase() + t.trim().slice(1).toLowerCase();
      if (!merged.includes(formatted)) {
        merged.push(formatted);
      }
    });
    return merged;
  }, [pets]);

  // Dynamically compute breeds for the currently selected type in the form
  const breedSuggestionsForType = useMemo(() => {
    const selectedType = formData.type;
    const presets = BREED_PRESETS[selectedType] || [];
    if (!pets) return presets;
    const dataBreeds = pets
      .filter((p) => p.type?.toLowerCase() === selectedType.toLowerCase() && p.breed)
      .map((p) => p.breed);
    const merged = [...presets];
    dataBreeds.forEach((b) => {
      if (!merged.some((m) => m.toLowerCase() === b.toLowerCase())) {
        merged.push(b);
      }
    });
    merged.sort((a, b) => a.localeCompare(b));
    return merged;
  }, [pets, formData.type]);

  // Fetch liability consents
  const { data: consents, isLoading: consentsLoading } = useQuery({
    queryKey: ["consents"],
    queryFn: () => dbService.getConsents(),
  });

  // Fetch consultations
  const { data: consultations, isLoading: consultationsLoading } = useQuery({
    queryKey: ["consultations"],
    queryFn: () => dbService.getConsultations(),
  });

  // Fetch contact submissions
  const {
    data: contactSubmissions = [],
    isLoading: contactsLoading,
    refetch: refetchContacts,
  } = useQuery({
    queryKey: ["contactSubmissions"],
    queryFn: () => dbService.getContactSubmissions(),
  });

  // Fetch orders for monthly chart analytics
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["adminOrders"],
    queryFn: async () => {
      const isMock = !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        const storedOrders = localStorage.getItem("pawhaven_orders") || "[]";
        try {
          return JSON.parse(storedOrders);
        } catch {
          return [];
        }
      }
      const { data, error } = await supabase
        .from("orders")
        .select("total, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const getMonthlyData = () => {
    // Generate the last 12 months dynamically
    const monthsData: { key: string; label: string; revenue: number }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // e.g. "2026-05"
      const label = d.toLocaleString("default", { month: "short" }); // e.g. "May"
      monthsData.push({ key, label, revenue: 0 });
    }

    // Sum revenue per month
    let hasActualData = false;
    if (orders && orders.length > 0) {
      orders.forEach((o: any) => {
        if (!o.created_at) return;
        const date = new Date(o.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const match = monthsData.find((m) => m.key === key);
        if (match) {
          match.revenue += Number(o.total);
          hasActualData = true;
        }
      });
    }

    // If there is no real order revenue yet, populate with realistic mock numbers so it's not empty
    if (!hasActualData) {
      const mockRevenues = [
        15000, 22000, 18000, 32000, 25000, 40000, 35000, 48000, 42000, 55000, 50000, 68000,
      ];
      monthsData.forEach((m, idx) => {
        m.revenue = mockRevenues[idx];
      });
    }

    return monthsData;
  };

  const monthlyData = getMonthlyData();
  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue)) || 1;

  // Fetch products (shop items)
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const isMock = !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        const stored = localStorage.getItem("pawhaven_products");
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {}
        }
        const { products: sampleProducts } = await import("@/data/sample");
        const list = sampleProducts.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          image_url: p.image || null,
          rating: p.rating,
          description: "Curated premium care product by WOOLF.INDIA",
          stock: 10,
        }));
        localStorage.setItem("pawhaven_products", JSON.stringify(list));
        return list;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
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
      description: pet.description || "",
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
      description: "",
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Pet Name is required");
    if (!formData.image_url.trim())
      return toast.error("Image is required. Please upload or specify a URL.");

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
      description: formData.description.trim(),
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
    setFormData((prev) => ({
      ...prev,
      image_url: key === "dogImage" || key === "catImage" ? PRESETS[key] : prev.image_url,
      video_url: key === "dogVideo" || key === "catVideo" ? PRESETS[key] : prev.video_url,
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
      rating: Number(prod.rating ?? 5.0),
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
      rating: 5.0,
    });
  };

  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productFormData.name.trim()) return toast.error("Product Name is required");
    if (!productFormData.image_url.trim())
      return toast.error("Image is required. Please upload or specify a URL.");

    const payload = {
      name: productFormData.name.trim(),
      category: productFormData.category,
      price: Number(productFormData.price),
      image_url: productFormData.image_url.trim(),
      description: productFormData.description.trim(),
      stock: Number(productFormData.stock),
      rating: Number(productFormData.rating),
    };

    const isMock = !!localStorage.getItem("pawhaven_mock_session");
    try {
      if (isMock) {
        const stored = localStorage.getItem("pawhaven_products") || "[]";
        let localProds = [];
        try {
          localProds = JSON.parse(stored);
        } catch {}

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
          const { error } = await supabase
            .from("products")
            .update(payload)
            .eq("id", editingProduct.id);
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
        try {
          localProds = JSON.parse(stored);
        } catch {}
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
    setProductFormData((prev) => ({
      ...prev,
      image_url: PRESETS.productImage,
    }));
    toast.info("Autofilled preset product image!");
  };

  // Lists filtering
  const standardPets = (pets ?? []).filter((p) => p.type.toLowerCase() !== "exotic");
  const exoticPets = (pets ?? []).filter((p) => p.type.toLowerCase() === "exotic");

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
            onClick={() => {
              setActiveTab("overview");
              setIsAdding(false);
              setEditingPet(null);
            }}
            className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "overview"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview & Stats
          </button>
          <button
            onClick={() => {
              setActiveTab("pets");
              setIsAdding(false);
              setEditingPet(null);
            }}
            className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "pets"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Manage Pets (Companions)
          </button>
          <button
            onClick={() => {
              setActiveTab("exotics");
              setIsAdding(false);
              setEditingPet(null);
            }}
            className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "exotics"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Manage Exotics (Rare Species)
          </button>
          <button
            onClick={() => {
              setActiveTab("products");
              setIsAddingProduct(false);
              setEditingProduct(null);
            }}
            className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "products"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Manage Shop Items (Products)
          </button>
          <button
            onClick={() => {
              setActiveTab("consent");
              setIsAdding(false);
              setEditingPet(null);
            }}
            className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "consent"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Liability & Consent Basis
          </button>
          <button
            onClick={() => {
              setActiveTab("consultations");
              setIsAdding(false);
              setEditingPet(null);
            }}
            className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "consultations"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Consultation Requests
          </button>
          <button
            onClick={() => {
              setActiveTab("bookings");
              setIsAdding(false);
              setEditingPet(null);
            }}
            className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "bookings"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Training Bookings
          </button>
          <button
            onClick={() => {
              setActiveTab("contacts");
              setIsAdding(false);
              setEditingPet(null);
            }}
            className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === "contacts"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Contact Messages
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="mt-8 space-y-8 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-3xl bg-card border border-border p-6 shadow-sm animate-pulse h-[120px]"
                    />
                  ))
                : stats?.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-3xl bg-card border border-border p-6 shadow-sm hover:shadow-md transition"
                    >
                      <s.icon className="text-accent" size={22} />
                      <div className="mt-3 font-display text-3xl">{s.value}</div>
                      <div className="text-sm text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
            </div>

            {/* Chart Widget */}
            <div className="rounded-3xl bg-card border border-border p-7 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-display text-2xl">Monthly Revenue Analytics</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sales revenue trends grouped by month over the past year.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent block">
                    Total Revenue
                  </span>
                  <strong className="font-display text-xl font-bold text-foreground">
                    ₹
                    {monthlyData
                      .reduce((sum, m) => sum + m.revenue, 0)
                      .toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </strong>
                </div>
              </div>

              <div className="flex items-end gap-2 sm:gap-3 h-52 pt-6 border-b border-border pb-2">
                {ordersLoading ? (
                  <div className="flex-1 flex justify-center items-center h-full text-muted-foreground animate-pulse text-sm">
                    Calculating monthly sales trends...
                  </div>
                ) : (
                  monthlyData.map((m) => {
                    const percent = Math.max((m.revenue / maxRevenue) * 100, 5); // min 5% so it's always visible
                    const isPeak = m.revenue === maxRevenue;
                    return (
                      <div
                        key={m.key}
                        className="flex-1 flex flex-col items-center h-full justify-end group relative"
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-2 bg-neutral-900 text-white text-[10px] sm:text-xs font-bold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-md z-10">
                          ₹{m.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>

                        {/* Interactive Bar */}
                        <div
                          className={`w-full rounded-t-md sm:rounded-t-lg transition-all duration-300 shadow-xs cursor-pointer hover:shadow-md ${
                            isPeak ? "bg-accent" : "bg-primary/75 group-hover:bg-accent"
                          }`}
                          style={{ height: `${percent}%` }}
                        />

                        {/* Label underneath */}
                        <span className="text-[10px] sm:text-xs text-muted-foreground mt-2 font-medium">
                          {m.label}
                        </span>
                      </div>
                    );
                  })
                )}
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
                <p className="text-sm text-muted-foreground">
                  Add, update, or remove standard pets (Dogs, Cats, Rabbits, etc.) in the active
                  system catalog.
                </p>
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
            {(isAdding || editingPet) && formData.type.toLowerCase() !== "exotic" && (
              <div className="rounded-3xl bg-card border-2 border-accent/20 p-8 shadow-md relative animate-slide-down">
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setEditingPet(null);
                  }}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground transition cursor-pointer"
                >
                  <FiX size={20} />
                </button>

                <h3 className="font-display text-2xl mb-6">
                  {editingPet
                    ? `Modify Companion Profile: ${editingPet.name}`
                    : "Register New Companion Pet"}
                </h3>

                <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Pet Name *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Max, Bella"
                        className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Pet Type
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Dog, Cat, Rabbit"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={formData.type}
                          onChange={(e) =>
                            setFormData({ ...formData, type: e.target.value, breed: "" })
                          }
                          list="pet-type-options"
                        />
                        <datalist id="pet-type-options">
                          {dynamicCompanionTypes.map((t) => (
                            <option key={t} value={t} />
                          ))}
                        </datalist>
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
                          {breedSuggestionsForType.map((b) => (
                            <option key={b} value={b} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <label className="text-xs font-semibold text-muted-foreground">
                          Price (₹) *
                        </label>
                        <input
                          required
                          type="number"
                          min={0}
                          placeholder="e.g. 45000"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData({ ...formData, price: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded text-primary h-4 w-4 border-input focus:ring-primary"
                          checked={formData.vaccinated}
                          onChange={(e) =>
                            setFormData({ ...formData, vaccinated: e.target.checked })
                          }
                        />
                        <span>Vaccinated</span>
                      </label>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Availability Status
                      </label>
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
                            <div
                              key={idx}
                              className="relative w-16 h-16 group rounded-lg overflow-hidden border border-border bg-background"
                            >
                              <img
                                src={url}
                                alt={`Preview ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = parseImages(formData.image_url).filter(
                                    (_, i) => i !== idx,
                                  );
                                  setFormData((prev) => ({
                                    ...prev,
                                    image_url:
                                      updated.length === 1
                                        ? updated[0]
                                        : updated.length > 1
                                          ? JSON.stringify(updated)
                                          : "",
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
                          onClick={() =>
                            autofillPreset(formData.type === "Cat" ? "catImage" : "dogImage")
                          }
                          className="text-[10px] bg-muted hover:bg-border px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                        >
                          <FiImage size={10} /> Use preset {formData.type === "Cat" ? "Cat" : "Dog"}{" "}
                          image
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Video URL (Optional)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Video stream MP4 link or upload below"
                          className="flex-1 rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={
                            formData.video_url?.startsWith("data:")
                              ? "Video loaded from computer"
                              : formData.video_url || ""
                          }
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
                          onClick={() =>
                            autofillPreset(formData.type === "Cat" ? "catVideo" : "dogVideo")
                          }
                          className="text-[10px] bg-muted hover:bg-border px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                        >
                          <FiPlay size={10} /> Use preset video stream
                        </button>
                        {formData.video_url && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, video_url: "" }));
                              toast.info("Video reference removed");
                            }}
                            className="text-[10px] bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer font-semibold"
                          >
                            <FiTrash2 size={10} /> Remove video
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Description
                      </label>
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
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setEditingPet(null);
                      }}
                      className="rounded-full border border-border bg-background px-6 py-2.5 text-sm hover:bg-muted transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
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
                        <td
                          colSpan={7}
                          className="px-6 py-10 text-center text-muted-foreground animate-pulse"
                        >
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
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${p.status === "available" ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEditClick(p)}
                                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                                title="Edit companion details"
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeletePet(p.id, p.name)}
                                className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition cursor-pointer"
                                title="Delete companion from catalog"
                              >
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
                <p className="text-sm text-muted-foreground">
                  Add, update, or remove rare and ethically-sourced exotic pets in the catalog.
                </p>
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
            {(isAdding || editingPet) && formData.type.toLowerCase() === "exotic" && (
              <div className="rounded-3xl bg-card border-2 border-amber-500/20 p-8 shadow-md relative animate-slide-down">
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setEditingPet(null);
                  }}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground transition cursor-pointer"
                >
                  <FiX size={20} />
                </button>

                <h3 className="font-display text-2xl mb-6 text-amber-950">
                  {editingPet
                    ? `Modify Exotic Profile: ${editingPet.name}`
                    : "Register New Exotic Pet / Species"}
                </h3>

                <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Exotic Pet Name *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Major, Ziggy"
                        className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Classification / Type
                        </label>
                        <input
                          disabled
                          type="text"
                          className="rounded-full border border-input bg-muted px-5 py-3 text-sm text-muted-foreground"
                          value="Exotic"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Species / Breed *
                        </label>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Age / Lifespan
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 6 months, 3 years"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Price (₹) *
                        </label>
                        <input
                          required
                          type="number"
                          min={0}
                          placeholder="e.g. 120000"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData({ ...formData, price: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded text-primary h-4 w-4 border-input focus:ring-primary"
                          checked={formData.vaccinated}
                          onChange={(e) =>
                            setFormData({ ...formData, vaccinated: e.target.checked })
                          }
                        />
                        <span>Health Certified & Vaccinated</span>
                      </label>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Availability Status
                      </label>
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
                            <div
                              key={idx}
                              className="relative w-16 h-16 group rounded-lg overflow-hidden border border-border bg-background"
                            >
                              <img
                                src={url}
                                alt={`Preview ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = parseImages(formData.image_url).filter(
                                    (_, i) => i !== idx,
                                  );
                                  setFormData((prev) => ({
                                    ...prev,
                                    image_url:
                                      updated.length === 1
                                        ? updated[0]
                                        : updated.length > 1
                                          ? JSON.stringify(updated)
                                          : "",
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
                      <label className="text-xs font-semibold text-muted-foreground">
                        Enclosure / Video Stream (Optional)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Video stream MP4 link or upload below"
                          className="flex-1 rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={
                            formData.video_url?.startsWith("data:")
                              ? "Video loaded from computer"
                              : formData.video_url || ""
                          }
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
                      {formData.video_url && (
                        <div className="flex gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, video_url: "" }));
                              toast.info("Video reference removed");
                            }}
                            className="text-[10px] bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer font-semibold w-fit"
                          >
                            <FiTrash2 size={10} /> Remove video
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Description & Ethological Requirements
                      </label>
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
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setEditingPet(null);
                      }}
                      className="rounded-full border border-border bg-background px-6 py-2.5 text-sm hover:bg-muted transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
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
                        <td
                          colSpan={6}
                          className="px-6 py-10 text-center text-muted-foreground animate-pulse"
                        >
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
                          <td className="px-6 py-4 font-display font-medium text-accent-foreground">
                            ₹{Number(p.price).toLocaleString()}
                          </td>
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
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${p.status === "available" ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEditClick(p)}
                                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer font-medium"
                                title="Edit companion details"
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeletePet(p.id, p.name)}
                                className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition cursor-pointer"
                                title="Delete companion from catalog"
                              >
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
                <p className="text-sm text-muted-foreground">
                  Add, update, or remove pet care products in the shop catalog.
                </p>
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
                  {editingProduct
                    ? `Modify Shop Item: ${editingProduct.name}`
                    : "Add New Shop Item"}
                </h3>

                <form
                  onSubmit={handleProductFormSubmit}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Product Name *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Grain-Free Kibble, Wool Bed"
                        className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                        value={productFormData.name}
                        onChange={(e) =>
                          setProductFormData({ ...productFormData, name: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Category
                        </label>
                        <select
                          className="rounded-full border border-input bg-background px-4 py-3 text-sm focus:outline-primary"
                          value={productFormData.category}
                          onChange={(e) =>
                            setProductFormData({ ...productFormData, category: e.target.value })
                          }
                        >
                          <option value="Food">Food</option>
                          <option value="Toys">Toys</option>
                          <option value="Grooming">Grooming</option>
                          <option value="Accessories">Accessories</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Price (₹) *
                        </label>
                        <input
                          required
                          type="number"
                          min={0}
                          placeholder="e.g. 1500"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={productFormData.price}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              price: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Rating (0 - 5) *
                        </label>
                        <input
                          required
                          type="number"
                          step="0.1"
                          min={0}
                          max={5}
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={productFormData.rating}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              rating: Number(e.target.value),
                            })
                          }
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Stock *
                        </label>
                        <input
                          required
                          type="number"
                          min={0}
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={productFormData.stock}
                          onChange={(e) =>
                            setProductFormData({
                              ...productFormData,
                              stock: Number(e.target.value),
                            })
                          }
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
                          value={
                            productFormData.image_url.startsWith("data:")
                              ? "Image loaded from computer"
                              : productFormData.image_url
                          }
                          onChange={(e) =>
                            setProductFormData({ ...productFormData, image_url: e.target.value })
                          }
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
                      <label className="text-xs font-semibold text-muted-foreground">
                        Description
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Provide details about the product's benefits, ingredients, dimensions, etc."
                        className="rounded-2xl border border-input bg-background px-5 py-3 text-sm focus:outline-primary resize-none"
                        value={productFormData.description}
                        onChange={(e) =>
                          setProductFormData({ ...productFormData, description: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 pt-4 border-t border-border/60 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingProduct(false);
                        setEditingProduct(null);
                      }}
                      className="rounded-full border border-border bg-background px-6 py-2.5 text-sm hover:bg-muted transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
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
                        <td
                          colSpan={6}
                          className="px-6 py-10 text-center text-muted-foreground animate-pulse"
                        >
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
                              src={
                                p.image_url.startsWith("data:")
                                  ? p.image_url
                                  : p.image_url || "/product-1.jpg"
                              }
                              alt={p.name}
                              className="h-10 w-10 rounded-full object-cover border border-border bg-muted"
                            />
                            <div>
                              <div className="font-semibold">{p.name}</div>
                              <div className="text-xs text-muted-foreground max-w-[250px] truncate">
                                {p.description}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">{p.category}</td>
                          <td className="px-6 py-4 font-display font-medium text-accent-foreground font-semibold">
                            ₹{Number(p.price).toFixed(0)}
                          </td>
                          <td className="px-6 py-4">{p.stock} units</td>
                          <td className="px-6 py-4">⭐ {Number(p.rating).toFixed(1)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEditProductClick(p)}
                                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer font-medium"
                                title="Edit product details"
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition cursor-pointer"
                                title="Delete product from catalog"
                              >
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

        {activeTab === "consent" && (
          <div className="mt-8 space-y-6 animate-fade-in">
            <div className="rounded-[2rem] bg-card border border-border p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-display text-3xl">Liability & Consent Signatures</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verify legal ownership agreements and liability waivers signed by customers.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Signee Name</th>
                      <th className="px-6 py-4">Email Address</th>
                      <th className="px-6 py-4">Pet Details</th>
                      <th className="px-6 py-4 text-center">Liability Accepted</th>
                      <th className="px-6 py-4 text-center">Consent Given</th>
                      <th className="px-6 py-4">Signature</th>
                      <th className="px-6 py-4">Date Signed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {consentsLoading ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-10 text-center text-muted-foreground animate-pulse"
                        >
                          Loading liability consent submissions...
                        </td>
                      </tr>
                    ) : consents?.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                          No liability or consent forms have been signed yet.
                        </td>
                      </tr>
                    ) : (
                      consents?.map((c: any) => (
                        <tr
                          key={c.id}
                          className="hover:bg-muted/20 transition cursor-pointer"
                          onClick={() => setSelectedConsent(c)}
                          title="Click to view signed consent form details"
                        >
                          <td className="px-6 py-4 font-semibold text-foreground">{c.full_name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{c.email}</td>
                          <td className="px-6 py-4 font-medium text-foreground">{c.pet_name}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600">
                              ✓ Accepted
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600">
                              ✓ Granted
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {c.signature_data_url ? (
                              <img
                                src={c.signature_data_url}
                                alt="Signature"
                                className="h-8 max-w-[120px] object-contain bg-white border border-border rounded p-0.5"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Text Sign
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {c.created_at ? new Date(c.created_at).toLocaleString() : "Recently"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedConsent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                <div className="relative w-full max-w-lg bg-card border border-border rounded-[2rem] p-8 shadow-2xl animate-scale-in text-foreground">
                  <button
                    onClick={() => setSelectedConsent(null)}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    aria-label="Close"
                  >
                    <FiX size={20} />
                  </button>

                  <div className="flex items-center gap-3 font-display text-2xl font-bold border-b border-border pb-4 mb-6">
                    <FiFileText className="text-primary" />
                    Agreement Copy Receipt
                  </div>

                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl border border-border/50">
                      <div>
                        <span className="text-xs text-muted-foreground block uppercase font-bold tracking-wider">
                          Signee / Owner
                        </span>
                        <strong className="text-base text-foreground font-semibold">
                          {selectedConsent.full_name}
                        </strong>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block uppercase font-bold tracking-wider">
                          Email Address
                        </span>
                        <span className="text-sm font-medium text-foreground block truncate">
                          {selectedConsent.email}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl border border-border/50">
                      <div>
                        <span className="text-xs text-muted-foreground block uppercase font-bold tracking-wider">
                          Pet Companion Name
                        </span>
                        <strong className="text-base text-foreground font-semibold">
                          {selectedConsent.pet_name}
                        </strong>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block uppercase font-bold tracking-wider">
                          Date Signed
                        </span>
                        <span className="text-sm font-medium text-foreground block">
                          {selectedConsent.created_at
                            ? new Date(selectedConsent.created_at).toLocaleString()
                            : "Recently"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-2">
                      <span className="text-xs text-muted-foreground block uppercase font-bold tracking-wider">
                        Legal Terms Verification
                      </span>
                      <div className="flex flex-col gap-1.5 text-xs text-foreground/90 font-medium">
                        <span className="flex items-center gap-1.5 text-green-600 font-semibold">
                          ✓ Liability Release Accepted
                        </span>
                        <span className="flex items-center gap-1.5 text-green-600 font-semibold">
                          ✓ Training & Vaccination Consent Granted
                        </span>
                      </div>
                    </div>

                    {selectedConsent.signature_data_url && (
                      <div className="border border-border/80 rounded-2xl bg-white p-4">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                          Customer Signature Representation
                        </div>
                        <div className="border border-border/50 rounded-xl bg-card p-2 h-24 flex justify-center items-center">
                          <img
                            src={selectedConsent.signature_data_url}
                            alt="Signature Drawing"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                    <button
                      onClick={() => window.print()}
                      className="rounded-full border border-border px-5 py-2 text-xs font-bold hover:bg-muted transition cursor-pointer"
                    >
                      Print Form
                    </button>
                    <button
                      onClick={() => setSelectedConsent(null)}
                      className="rounded-full bg-primary text-primary-foreground px-6 py-2 text-xs font-bold hover:opacity-90 transition cursor-pointer"
                    >
                      Close View
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "consultations" && (
          <div className="mt-8 space-y-6 animate-fade-in">
            <div className="rounded-[2rem] bg-card border border-border p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-display text-3xl">Consultation Requests</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage and review custom consultation requests submitted by clients.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Client Name</th>
                      <th className="px-6 py-4">Email Address</th>
                      <th className="px-6 py-4">Requested Pet Type</th>
                      <th className="px-6 py-4">Requested Breed</th>
                      <th className="px-6 py-4">Min Price</th>
                      <th className="px-6 py-4">Max Price</th>
                      <th className="px-6 py-4">Requested At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {consultationsLoading ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-10 text-center text-muted-foreground animate-pulse"
                        >
                          Loading consultation requests...
                        </td>
                      </tr>
                    ) : consultations?.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                          No consultation requests have been submitted yet.
                        </td>
                      </tr>
                    ) : (
                      consultations?.map((c: any) => (
                        <tr key={c.id} className="hover:bg-muted/20 transition">
                          <td className="px-6 py-4 font-semibold text-foreground">{c.name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{c.email}</td>
                          <td className="px-6 py-4 font-medium text-foreground">{c.pet_type}</td>
                          <td className="px-6 py-4 text-muted-foreground font-medium">
                            {c.breed || "Any"}
                          </td>
                          <td className="px-6 py-4 font-semibold text-accent-foreground">
                            ₹{Number(c.price_min).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-semibold text-accent-foreground">
                            ₹{Number(c.price_max).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {c.created_at ? new Date(c.created_at).toLocaleString() : "Recently"}
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

        {activeTab === "bookings" && (
          <div className="mt-8 space-y-8 animate-fade-in text-foreground">
            {/* Sub-tabs header */}
            <div className="flex gap-4 border-b border-border/50 pb-3">
              <button
                type="button"
                onClick={() => setBookingSubTab("training")}
                className={`px-6 py-2.5 text-sm font-semibold rounded-full transition cursor-pointer ${
                  bookingSubTab === "training"
                    ? "bg-primary text-primary-foreground shadow-sm font-bold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Training Sessions
              </button>
              <button
                type="button"
                onClick={() => setBookingSubTab("hostelling")}
                className={`px-6 py-2.5 text-sm font-semibold rounded-full transition cursor-pointer ${
                  bookingSubTab === "hostelling"
                    ? "bg-primary text-primary-foreground shadow-sm font-bold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Hostelling Stays
              </button>
            </div>

            {bookingSubTab === "training" ? (
              <div className="space-y-8 animate-fade-in">
                {/* Stats Row */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                      Total Training Bookings
                    </div>
                    <div className="mt-2 font-display text-4xl text-foreground">
                      {trainingBookings.length}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                      Completed Training
                    </div>
                    <div className="mt-2 font-display text-4xl text-emerald-600">
                      {trainingBookings.filter((b) => b.completed).length}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                      Most Popular Program
                    </div>
                    <div className="mt-2 font-display text-2xl text-primary">
                      {(() => {
                        const counts: Record<string, number> = {};
                        trainingBookings.forEach((b) => {
                          counts[b.trainingType] = (counts[b.trainingType] || 0) + 1;
                        });
                        const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
                        return sorted.length > 0 ? `${sorted[0][0]} (${sorted[0][1]})` : "N/A";
                      })()}
                    </div>
                  </div>
                </div>

                {/* Calendar */}
                <div>
                  <h2 className="font-display text-3xl mb-4 text-foreground">Booking Calendar</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Click on any date to view booking details. You can cancel individual bookings to
                    free up slots.
                  </p>
                  <div className="max-w-2xl">
                    <BookingCalendar
                      mode="admin"
                      bookings={trainingBookings}
                      maxPerDay={3}
                      onDeleteBooking={handleDeleteBooking}
                    />
                  </div>
                </div>

                {/* All Bookings Table */}
                <div>
                  <h3 className="font-display text-2xl mb-4 text-foreground">
                    All Booking Records
                  </h3>
                  <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
                    <table className="min-w-full bg-card text-sm text-left">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">
                            Completed
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Owner
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Pet
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Program
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Date
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Commands
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Medical
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Signature
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {trainingBookings.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="text-center py-10 text-muted-foreground italic"
                            >
                              No training bookings yet.
                            </td>
                          </tr>
                        ) : (
                          trainingBookings.map((b) => (
                            <tr
                              key={b.id}
                              className={`hover:bg-muted/20 transition ${b.completed ? "opacity-60 bg-muted/5" : ""}`}
                            >
                              <td className="px-5 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={b.completed || false}
                                  onChange={async (e) => {
                                    try {
                                      await dbService.updateTrainingBooking(b.id, {
                                        completed: e.target.checked,
                                      });
                                      refetchTraining();
                                      toast.success(
                                        `Session marked as ${e.target.checked ? "completed" : "pending"}`,
                                      );
                                    } catch {
                                      toast.error("Failed to update status");
                                    }
                                  }}
                                  className="rounded text-primary h-5 w-5 border-input focus:ring-primary cursor-pointer accent-primary"
                                />
                              </td>
                              <td className="px-5 py-3 font-semibold text-foreground">
                                {b.ownerName}
                              </td>
                              <td className="px-5 py-3 text-foreground">
                                {b.petName}{" "}
                                <span className="text-muted-foreground">
                                  ({b.breed}, {b.age})
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                    b.trainingType === "Basic"
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : b.trainingType === "Moderate"
                                        ? "bg-amber-500/10 text-amber-600"
                                        : "bg-primary/10 text-primary"
                                  }`}
                                >
                                  {b.trainingType}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-foreground">{b.preferredDate}</td>
                              <td className="px-5 py-3 text-muted-foreground text-xs">
                                {b.selectedCommands && b.selectedCommands.length > 0
                                  ? b.selectedCommands.join(", ")
                                  : "—"}
                              </td>
                              <td className="px-5 py-3 text-muted-foreground text-xs">
                                {b.medicalConditions}
                              </td>
                              <td className="px-5 py-3">
                                {b.signatureDataUrl ? (
                                  <div className="flex flex-col gap-1">
                                    <img
                                      src={b.signatureDataUrl}
                                      alt="Signature"
                                      className="h-8 max-w-[100px] object-contain bg-white border border-border rounded p-0.5"
                                    />
                                    <span className="text-[9px] font-semibold text-emerald-600">
                                      ✓ Consent Granted
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingTraining(b)}
                                    className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                                    title="Edit session details"
                                  >
                                    <FiEdit2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBooking(b.id)}
                                    className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition cursor-pointer"
                                    title="Cancel session"
                                  >
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
            ) : (
              <div className="space-y-8 animate-fade-in">
                {/* Hostelling Stats Row */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                      Total Stays Registered
                    </div>
                    <div className="mt-2 font-display text-4xl text-foreground">
                      {hostellingBookings.length}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                      Completed Stays
                    </div>
                    <div className="mt-2 font-display text-4xl text-emerald-600">
                      {hostellingBookings.filter((b) => b.completed).length}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                      Active / Pending Stays
                    </div>
                    <div className="mt-2 font-display text-4xl text-amber-600">
                      {hostellingBookings.filter((b) => !b.completed).length}
                    </div>
                  </div>
                </div>

                {/* All Hostelling Table */}
                <div>
                  <h3 className="font-display text-2xl mb-4 text-foreground">
                    All Boarding Stays Records
                  </h3>
                  <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
                    <table className="min-w-full bg-card text-sm text-left">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">
                            Completed
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Parent Details
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Pet Details
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Duration
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Behavior & Health
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                            Signature
                          </th>
                          <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {hostellingBookings.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="text-center py-10 text-muted-foreground italic"
                            >
                              No hostelling stays yet.
                            </td>
                          </tr>
                        ) : (
                          hostellingBookings.map((b) => (
                            <tr
                              key={b.id}
                              className={`hover:bg-muted/20 transition ${b.completed ? "opacity-60 bg-muted/5" : ""}`}
                            >
                              <td className="px-5 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={b.completed || false}
                                  onChange={async (e) => {
                                    try {
                                      await dbService.updateHostellingBooking(b.id, {
                                        completed: e.target.checked,
                                      });
                                      refetchHostelling();
                                      toast.success(
                                        `Stay marked as ${e.target.checked ? "completed" : "pending"}`,
                                      );
                                    } catch {
                                      toast.error("Failed to update status");
                                    }
                                  }}
                                  className="rounded text-primary h-5 w-5 border-input focus:ring-primary cursor-pointer accent-primary"
                                />
                              </td>
                              <td className="px-5 py-3">
                                <div className="font-semibold text-foreground">{b.parentName}</div>
                                <div className="text-xs text-muted-foreground">{b.parentEmail}</div>
                                <div className="text-xs text-muted-foreground">{b.parentPhone}</div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="font-semibold text-foreground">{b.petName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {b.petBreed} ({b.petGender}, {b.petAge})
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="font-semibold text-primary">{b.numDays} Days</div>
                                <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {b.checkInDate} to {b.checkOutDate}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="text-xs text-foreground">
                                  Temperament:{" "}
                                  <span
                                    className={`font-semibold ${b.temperament === "Friendly" ? "text-emerald-600" : "text-amber-600"}`}
                                  >
                                    {b.temperament}
                                  </span>
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  Trained:{" "}
                                  {b.urineTrained && b.pottyTrained
                                    ? "Urine & Potty"
                                    : b.urineTrained
                                      ? "Urine Only"
                                      : b.pottyTrained
                                        ? "Potty Only"
                                        : "No"}
                                </div>
                                {b.medicalConditions && b.medicalConditions !== "N/A" && (
                                  <div
                                    className="text-[10px] text-red-500 font-medium truncate max-w-[150px]"
                                    title={b.medicalConditions}
                                  >
                                    Med: {b.medicalConditions}
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-3">
                                {b.signatureDataUrl ? (
                                  <img
                                    src={b.signatureDataUrl}
                                    alt="Signature"
                                    className="h-8 max-w-[100px] object-contain bg-white border border-border rounded p-0.5"
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingHostelling(b)}
                                    className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                                    title="Edit stay details"
                                  >
                                    <FiEdit2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteHostelling(b.id)}
                                    className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition cursor-pointer"
                                    title="Remove record"
                                  >
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

            {/* Modal: Edit Training Booking */}
            {editingTraining && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in text-foreground">
                <div className="relative w-full max-w-lg bg-card border border-border rounded-[2rem] p-8 shadow-2xl animate-scale-in">
                  <button
                    type="button"
                    onClick={() => setEditingTraining(null)}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    <FiX size={20} />
                  </button>

                  <h3 className="font-display text-2xl font-bold border-b border-border pb-4 mb-6">
                    Edit Training Session
                  </h3>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await dbService.updateTrainingBooking(editingTraining.id, {
                          ownerName: editingTraining.ownerName,
                          petName: editingTraining.petName,
                          breed: editingTraining.breed,
                          age: editingTraining.age,
                          trainingType: editingTraining.trainingType,
                          preferredDate: editingTraining.preferredDate,
                          medicalConditions: editingTraining.medicalConditions,
                        });
                        setEditingTraining(null);
                        refetchTraining();
                        toast.success("Training booking successfully updated.");
                      } catch {
                        toast.error("Failed to update training booking.");
                      }
                    }}
                    className="space-y-4 text-sm"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Owner Name
                      </label>
                      <input
                        required
                        type="text"
                        className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                        value={editingTraining.ownerName}
                        onChange={(e) =>
                          setEditingTraining({ ...editingTraining, ownerName: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Pet Name
                        </label>
                        <input
                          required
                          type="text"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={editingTraining.petName}
                          onChange={(e) =>
                            setEditingTraining({ ...editingTraining, petName: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Pet Breed
                        </label>
                        <input
                          required
                          type="text"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={editingTraining.breed}
                          onChange={(e) =>
                            setEditingTraining({ ...editingTraining, breed: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Age</label>
                        <input
                          required
                          type="text"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={editingTraining.age}
                          onChange={(e) =>
                            setEditingTraining({ ...editingTraining, age: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Training Type
                        </label>
                        <select
                          className="rounded-full border border-input bg-background px-4 py-3 text-sm focus:outline-primary"
                          value={editingTraining.trainingType}
                          onChange={(e) =>
                            setEditingTraining({
                              ...editingTraining,
                              trainingType: e.target.value as any,
                            })
                          }
                        >
                          <option value="Basic">Basic</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Advance">Advance</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Preferred Date
                      </label>
                      <input
                        required
                        type="date"
                        className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                        value={editingTraining.preferredDate}
                        onChange={(e) =>
                          setEditingTraining({ ...editingTraining, preferredDate: e.target.value })
                        }
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Medical Conditions
                      </label>
                      <textarea
                        rows={3}
                        className="rounded-2xl border border-input bg-background px-5 py-3 text-sm focus:outline-primary resize-none"
                        value={editingTraining.medicalConditions}
                        onChange={(e) =>
                          setEditingTraining({
                            ...editingTraining,
                            medicalConditions: e.target.value,
                          })
                        }
                      />
                    </div>

                    {editingTraining.signatureDataUrl && (
                      <div className="border border-border/80 rounded-2xl bg-white p-4">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                          Virtual Signature Representation
                        </div>
                        <div className="border border-border/50 rounded-xl bg-card p-2 h-20 flex justify-center items-center">
                          <img
                            src={editingTraining.signatureDataUrl}
                            alt="Signature"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-border flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingTraining(null)}
                        className="rounded-full border border-border px-6 py-2.5 hover:bg-muted transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-full bg-primary text-primary-foreground font-semibold px-7 py-2.5 hover:opacity-90 transition cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Edit Hostelling Stay */}
            {editingHostelling && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in text-foreground">
                <div className="relative w-full max-w-lg bg-card border border-border rounded-[2rem] p-8 shadow-2xl animate-scale-in">
                  <button
                    type="button"
                    onClick={() => setEditingHostelling(null)}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    <FiX size={20} />
                  </button>

                  <h3 className="font-display text-2xl font-bold border-b border-border pb-4 mb-6">
                    Edit Boarding Stay
                  </h3>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const start = new Date(editingHostelling.checkInDate);
                      const end = new Date(editingHostelling.checkOutDate);
                      const diffTime = end.getTime() - start.getTime();
                      const calculatedDays = Math.max(
                        Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
                        1,
                      );

                      try {
                        await dbService.updateHostellingBooking(editingHostelling.id, {
                          parentName: editingHostelling.parentName,
                          parentEmail: editingHostelling.parentEmail,
                          parentPhone: editingHostelling.parentPhone,
                          petName: editingHostelling.petName,
                          petBreed: editingHostelling.petBreed,
                          petGender: editingHostelling.petGender,
                          petAge: editingHostelling.petAge,
                          checkInDate: editingHostelling.checkInDate,
                          checkOutDate: editingHostelling.checkOutDate,
                          numDays: calculatedDays,
                          temperament: editingHostelling.temperament,
                          aggressionDetails: editingHostelling.aggressionDetails,
                          urineTrained: editingHostelling.urineTrained,
                          pottyTrained: editingHostelling.pottyTrained,
                          medicalConditions: editingHostelling.medicalConditions,
                        });
                        setEditingHostelling(null);
                        refetchHostelling();
                        toast.success("Hostelling booking successfully updated.");
                      } catch {
                        toast.error("Failed to update hostelling booking.");
                      }
                    }}
                    className="space-y-4 text-sm overflow-y-auto max-h-[80vh] pr-2"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Parent / Owner Name
                      </label>
                      <input
                        required
                        type="text"
                        className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                        value={editingHostelling.parentName}
                        onChange={(e) =>
                          setEditingHostelling({ ...editingHostelling, parentName: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Parent Email
                        </label>
                        <input
                          required
                          type="email"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={editingHostelling.parentEmail}
                          onChange={(e) =>
                            setEditingHostelling({
                              ...editingHostelling,
                              parentEmail: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Parent Phone
                        </label>
                        <input
                          required
                          type="text"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={editingHostelling.parentPhone}
                          onChange={(e) =>
                            setEditingHostelling({
                              ...editingHostelling,
                              parentPhone: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Pet Name
                        </label>
                        <input
                          required
                          type="text"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={editingHostelling.petName}
                          onChange={(e) =>
                            setEditingHostelling({ ...editingHostelling, petName: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Breed</label>
                        <input
                          required
                          type="text"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={editingHostelling.petBreed}
                          onChange={(e) =>
                            setEditingHostelling({ ...editingHostelling, petBreed: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Gender
                        </label>
                        <select
                          className="rounded-full border border-input bg-background px-4 py-3 text-sm focus:outline-primary"
                          value={editingHostelling.petGender}
                          onChange={(e) =>
                            setEditingHostelling({
                              ...editingHostelling,
                              petGender: e.target.value as any,
                            })
                          }
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Age</label>
                        <input
                          required
                          type="text"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={editingHostelling.petAge}
                          onChange={(e) =>
                            setEditingHostelling({ ...editingHostelling, petAge: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Check-in Date
                        </label>
                        <input
                          required
                          type="date"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={editingHostelling.checkInDate}
                          onChange={(e) =>
                            setEditingHostelling({
                              ...editingHostelling,
                              checkInDate: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Check-out Date
                        </label>
                        <input
                          required
                          type="date"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={editingHostelling.checkOutDate}
                          onChange={(e) =>
                            setEditingHostelling({
                              ...editingHostelling,
                              checkOutDate: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Temperament
                        </label>
                        <select
                          className="rounded-full border border-input bg-background px-4 py-3 text-sm focus:outline-primary"
                          value={editingHostelling.temperament}
                          onChange={(e) =>
                            setEditingHostelling({
                              ...editingHostelling,
                              temperament: e.target.value as any,
                            })
                          }
                        >
                          <option value="Friendly">Friendly</option>
                          <option value="Aggressive">Aggressive</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5 pt-5">
                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="rounded text-primary h-4 w-4 border-input focus:ring-primary accent-primary"
                            checked={editingHostelling.urineTrained}
                            onChange={(e) =>
                              setEditingHostelling({
                                ...editingHostelling,
                                urineTrained: e.target.checked,
                              })
                            }
                          />
                          <span>Urine Trained</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none mt-2">
                          <input
                            type="checkbox"
                            className="rounded text-primary h-4 w-4 border-input focus:ring-primary accent-primary"
                            checked={editingHostelling.pottyTrained}
                            onChange={(e) =>
                              setEditingHostelling({
                                ...editingHostelling,
                                pottyTrained: e.target.checked,
                              })
                            }
                          />
                          <span>Potty Trained</span>
                        </label>
                      </div>
                    </div>

                    {editingHostelling.temperament === "Aggressive" && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Aggression Details / Triggers
                        </label>
                        <input
                          required
                          type="text"
                          className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary"
                          value={editingHostelling.aggressionDetails || ""}
                          onChange={(e) =>
                            setEditingHostelling({
                              ...editingHostelling,
                              aggressionDetails: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Medical Conditions
                      </label>
                      <textarea
                        rows={3}
                        className="rounded-2xl border border-input bg-background px-5 py-3 text-sm focus:outline-primary resize-none"
                        value={editingHostelling.medicalConditions}
                        onChange={(e) =>
                          setEditingHostelling({
                            ...editingHostelling,
                            medicalConditions: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="pt-4 border-t border-border flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingHostelling(null)}
                        className="rounded-full border border-border px-6 py-2.5 hover:bg-muted transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-full bg-primary text-primary-foreground font-semibold px-7 py-2.5 hover:opacity-90 transition cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "contacts" && (
          <div className="mt-8 space-y-8 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-display text-3xl">Contact Messages</h2>
                <p className="text-sm text-muted-foreground">
                  View and manage messages submitted through the contact form by website visitors.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-card border border-border px-5 py-3 shadow-sm">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Total Messages
                  </span>
                  <span className="ml-2 font-display text-2xl text-foreground">
                    {contactSubmissions.length}
                  </span>
                </div>
                <div className="rounded-2xl bg-card border border-border px-5 py-3 shadow-sm">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                    Unread
                  </span>
                  <span className="ml-2 font-display text-2xl text-amber-500">
                    {contactSubmissions.filter((c) => !c.read).length}
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-3xl bg-card border border-border shadow-sm">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Message</th>
                    <th className="px-6 py-4">Received At</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contactsLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-10 text-center text-muted-foreground animate-pulse"
                      >
                        Loading contact messages...
                      </td>
                    </tr>
                  ) : contactSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                        No contact messages have been received yet.
                      </td>
                    </tr>
                  ) : (
                    contactSubmissions.map((c) => (
                      <tr
                        key={c.id}
                        className={`hover:bg-muted/20 transition ${c.read ? "opacity-60" : ""}`}
                      >
                        <td className="px-6 py-4 text-center">
                          {c.read ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              <FiEye size={12} /> Read
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
                              <FiMail size={12} /> New
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-foreground">{c.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          <a
                            href={`mailto:${c.email}`}
                            className="hover:underline hover:text-accent transition"
                          >
                            {c.email}
                          </a>
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">{c.subject}</td>
                        <td className="px-6 py-4 text-muted-foreground max-w-[250px]">
                          <div className="line-clamp-2" title={c.message}>
                            {c.message}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                          {c.created_at ? new Date(c.created_at).toLocaleString() : "Recently"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await dbService.markContactSubmissionRead(c.id, !c.read);
                                  refetchContacts();
                                  toast.success(c.read ? "Marked as unread" : "Marked as read");
                                } catch {
                                  toast.error("Failed to update status");
                                }
                              }}
                              className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                              title={c.read ? "Mark as unread" : "Mark as read"}
                            >
                              {c.read ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                            </button>
                            <a
                              href={`mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject)}`}
                              className="p-2 rounded-full hover:bg-accent/10 text-muted-foreground hover:text-accent transition"
                              title="Reply via email"
                            >
                              <FiMail size={14} />
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm(`Delete message from ${c.name}?`)) return;
                                try {
                                  await dbService.deleteContactSubmission(c.id);
                                  refetchContacts();
                                  toast.success("Message deleted.");
                                } catch {
                                  toast.error("Failed to delete message.");
                                }
                              }}
                              className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition cursor-pointer"
                              title="Delete message"
                            >
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
        )}
      </section>
    </SiteLayout>
  );
}
