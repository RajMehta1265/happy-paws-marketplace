import { supabase } from "@/integrations/supabase/client";
import pet1 from "@/assets/pet-1.jpg";
import pet2 from "@/assets/pet-2.jpg";
import pet3 from "@/assets/pet-3.jpg";
import pet4 from "@/assets/pet-4.jpg";
import scarletMacaw from "@/assets/scarlet-macaw.png";
import sugarGlider from "@/assets/sugar-glider.png";
import chameleon from "@/assets/chameleon.png";

export const safeUUID = (): string => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const openIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject("IndexedDB not available");
      return;
    }
    const request = window.indexedDB.open("pawhaven_media_db", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("media")) {
        db.createObjectStore("media");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const mediaCache: Record<string, string> = {};

const DELETED_IDS_KEY = "pawhaven_deleted_pet_ids";

const getDeletedPetIds = (): string[] => {
  if (typeof window === "undefined") return [];
  const val = localStorage.getItem(DELETED_IDS_KEY);
  try {
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
};

const addDeletedPetId = (id: string) => {
  if (typeof window === "undefined") return;
  const list = getDeletedPetIds();
  if (!list.includes(id)) {
    list.push(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(list));
  }
};

// Preload all media from IndexedDB into mediaCache on app startup
if (typeof window !== "undefined") {
  setTimeout(async () => {
    try {
      const db = await openIndexedDB();
      const tx = db.transaction("media", "readonly");
      const store = tx.objectStore("media");
      const req = store.openCursor();
      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          mediaCache[cursor.key] = cursor.value;
          cursor.continue();
        }
      };
    } catch (e) {
      console.warn("Failed to preload media cache:", e);
    }
  }, 100);
}

// Background media pruner to remove heavy local base64 images/videos that stall the browser thread
if (typeof window !== "undefined") {
  setTimeout(async () => {
    try {
      const db = await openIndexedDB();
      const tx = db.transaction("media", "readwrite");
      const store = tx.objectStore("media");
      const req = store.openCursor();
      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          const value = cursor.value;
          if (typeof value === "string" && value.length > 2 * 1024 * 1024) {
            console.log(`Pruning large IndexedDB media key: ${cursor.key} (size: ${value.length})`);
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch (e) {
      console.warn("IndexedDB background pruning failed:", e);
    }
  }, 2000);
}

const storeMedia = async (key: string, value: string): Promise<string> => {
  if (typeof window === "undefined" || !value || !value.startsWith("data:")) return value;
  mediaCache[key] = value; // Update cache instantly
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("media", "readwrite");
      const store = tx.objectStore("media");
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return `indexeddb://${key}`;
  } catch (err) {
    console.warn("Failed to save to IndexedDB:", err);
    return value;
  }
};

const loadMedia = async (value: string | null | undefined): Promise<string | null> => {
  if (!value || !value.startsWith("indexeddb://")) return value || null;
  const key = value.replace("indexeddb://", "");
  if (mediaCache[key]) return mediaCache[key];
  try {
    const db = await openIndexedDB();
    const result = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction("media", "readonly");
      const store = tx.objectStore("media");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (result) {
      mediaCache[key] = result;
    }
    return result;
  } catch (err) {
    console.warn("Failed to load from IndexedDB:", err);
    return null;
  }
};

const deleteMedia = async (key: string): Promise<void> => {
  if (typeof window === "undefined") return;
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("media", "readwrite");
      const store = tx.objectStore("media");
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to delete from IndexedDB:", err);
  }
};

const withTimeout = <T>(promise: PromiseLike<T>, ms = 10000): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Database request timeout")), ms);
    promise.then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
};

export const parseImages = (imageUrlString: string | null | undefined): string[] => {
  if (!imageUrlString) return [];
  const trimmed = imageUrlString.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          if (typeof item === "string" && item.startsWith("indexeddb://")) {
            const key = item.replace("indexeddb://", "");
            return mediaCache[key] || item;
          }
          return item;
        });
      }
    } catch (e) {
      console.warn("Failed to parse image_url JSON in parseImages:", e);
    }
  }
  if (trimmed.startsWith("indexeddb://")) {
    const key = trimmed.replace("indexeddb://", "");
    return [mediaCache[key] || trimmed];
  }
  return [imageUrlString];
};

const storeMediaArrayOrSingle = async (keyPrefix: string, value: string): Promise<string> => {
  if (!value) return value;
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const storedArray = await Promise.all(
          parsed.map(async (item, index) => {
            return await storeMedia(`${keyPrefix}_${index}`, item);
          })
        );
        return JSON.stringify(storedArray);
      }
    } catch (e) {
      console.warn("Failed to parse image_url as JSON array in storeMedia:", e);
    }
  }
  return await storeMedia(keyPrefix, value);
};

const loadMediaArrayOrSingle = async (value: string | null | undefined): Promise<string | null> => {
  if (!value) return value || null;
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const loadedArray = await Promise.all(
          parsed.map(async (item) => {
            const loaded = await loadMedia(item);
            return loaded || item;
          })
        );
        return JSON.stringify(loadedArray);
      }
    } catch (e) {
      console.warn("Failed to parse image_url as JSON array in loadMedia:", e);
    }
  }
  return await loadMedia(value);
};

export interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string;
  age: string;
  price: number;
  image_url: string;
  video_url?: string | null;
  vaccinated: boolean;
  adoption: boolean;
  status: string;
  description: string;
  created_at?: string;
}

export interface Consultation {
  id: string;
  name: string;
  email: string;
  pet_type: string;
  price_min: number;
  price_max: number;
  created_at?: string;
}

export interface LiabilityConsent {
  id: string;
  user_id?: string | null;
  full_name: string;
  email: string;
  pet_id?: string | null;
  pet_name: string;
  liability_accepted: boolean;
  consent_given: boolean;
  signature_data_url?: string | null;
  created_at?: string;
}

export interface Review {
  id: string;
  petId: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface TrainingBooking {
  id: string;
  user_id: string | null;
  ownerName: string;
  petName: string;
  breed: string;
  age: string;
  trainingType: "Basic" | "Moderate" | "Advance";
  preferredDate: string;
  selectedCommands: string[];
  medicalConditions: string;
  createdAt: string;
}

const LOCAL_STORAGE_KEY = "pawhaven_pets";
const CONSULTATIONS_LOCAL_KEY = "pawhaven_consultations";
const CONSENTS_LOCAL_KEY = "pawhaven_liability_consent";
const REVIEWS_LOCAL_KEY = "pawhaven_pet_reviews";
const TRAINING_BOOKINGS_LOCAL_KEY = "pawhaven_training_bookings";

const DEFAULT_REVIEWS: Review[] = [
  { id: "1", petId: "d1111111-1111-1111-1111-111111111111", author: "Sarah M.", rating: 5, text: "Milo is a bundle of joy! Very healthy and well-behaved.", date: "2026-05-15" },
  { id: "2", petId: "d1111111-1111-1111-1111-111111111111", author: "Aman P.", rating: 5, text: "Extremely friendly. The onboarding instructions were super helpful.", date: "2026-05-20" },
  { id: "3", petId: "d2222222-2222-2222-2222-222222222222", author: "Deepak S.", rating: 5, text: "Luna is the sweetest Persian kitten. Pure white fur and green eyes!", date: "2026-05-18" },
  { id: "4", petId: "d4444444-4444-4444-4444-444444444444", author: "Priyah K.", rating: 4, text: "Kiwi sings beautifully every morning. Healthy bird.", date: "2026-05-22" },
  { id: "5", petId: "d6666666-6666-6666-6666-666666666666", author: "Vikram R.", rating: 5, text: "Mochi loves curling up in my lap. So content and quiet.", date: "2026-05-25" },
];

// Default seed data matching sample.ts, plus video placeholders
const DEFAULT_PETS: Pet[] = [
  {
    id: "d1111111-1111-1111-1111-111111111111",
    name: "Milo",
    type: "Dog",
    breed: "Beagle",
    age: "3 months",
    price: 650,
    image_url: pet1,
    video_url:
      "https://assets.mixkit.co/videos/preview/mixkit-playful-dog-in-the-snow-31804-large.mp4",
    vaccinated: true,
    adoption: false,
    status: "available",
    description: "A curious and gentle beagle pup, fully vaccinated and ready for cuddles.",
  },
  {
    id: "d2222222-2222-2222-2222-222222222222",
    name: "Luna",
    type: "Cat",
    breed: "Persian",
    age: "5 months",
    price: 480,
    image_url: pet2,
    video_url:
      "https://assets.mixkit.co/videos/preview/mixkit-cat-resting-on-a-cushion-41484-large.mp4",
    vaccinated: true,
    adoption: false,
    status: "available",
    description: "Soft, dreamy persian kitten with bright eyes and a sweet temperament.",
  },
  {
    id: "d3333333-3333-3333-3333-333333333333",
    name: "Biscuit",
    type: "Rabbit",
    breed: "Holland Lop",
    age: "4 months",
    price: 0, // Adoption is free
    image_url: pet3,
    video_url: null,
    vaccinated: true,
    adoption: true,
    status: "available",
    description: "Looking for a forever home — calm, litter-trained, loves leafy greens.",
  },
  {
    id: "d4444444-4444-4444-4444-444444444444",
    name: "Kiwi",
    type: "Bird",
    breed: "Budgerigar",
    age: "6 months",
    price: 90,
    image_url: pet4,
    video_url: null,
    vaccinated: false,
    adoption: false,
    status: "available",
    description: "Cheerful little budgie who already mimics a few whistles.",
  },
  {
    id: "d5555555-5555-5555-5555-555555555555",
    name: "Rosie",
    type: "Dog",
    breed: "Labrador",
    age: "2 months",
    price: 0, // Adoption is free
    image_url: pet1,
    video_url:
      "https://assets.mixkit.co/videos/preview/mixkit-golden-retriever-puppy-sitting-on-grass-32860-large.mp4",
    vaccinated: true,
    adoption: true,
    status: "available",
    description: "Rescue Labrador puppy ready for a loving family.",
  },
  {
    id: "d6666666-6666-6666-6666-666666666666",
    name: "Mochi",
    type: "Cat",
    breed: "Persian",
    age: "3 months",
    price: 520,
    image_url: pet2,
    video_url: null,
    vaccinated: true,
    adoption: false,
    status: "available",
    description: "Plush coat, gentle nature, ideal lap companion.",
  },
  {
    id: "d7777777-7777-7777-7777-777777777777",
    name: "Major",
    type: "Exotic",
    breed: "Scarlet Macaw",
    age: "12 months",
    price: 120000,
    image_url: scarletMacaw,
    video_url: null,
    vaccinated: true,
    adoption: false,
    status: "available",
    description:
      "A magnificent and highly intelligent Scarlet Macaw. Bright plumage, friendly social behavior, and starts to speak a few words.",
  },
  {
    id: "d8888888-8888-8888-8888-888888888888",
    name: "Ziggy",
    type: "Exotic",
    breed: "Veiled Chameleon",
    age: "6 months",
    price: 32000,
    image_url: chameleon,
    video_url: null,
    vaccinated: true,
    adoption: false,
    status: "available",
    description:
      "Stunning Veiled Chameleon with incredible color dynamics. Active, healthy, and accustomed to standard handling.",
  },
  {
    id: "d9999999-9999-9999-9999-999999999999",
    name: "Peanut",
    type: "Exotic",
    breed: "Sugar Glider",
    age: "4 months",
    price: 24000,
    image_url: sugarGlider,
    video_url: null,
    vaccinated: true,
    adoption: false,
    status: "available",
    description:
      "Playful and bonded Sugar Glider marsupial. Enjoys human interaction and loves spending time in a bonding pouch.",
  },
];

export const dbService = {
  // Helper to initialize local storage if empty
  initLocalData(): Pet[] {
    if (typeof window === "undefined") return DEFAULT_PETS;
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_PETS));
      return DEFAULT_PETS;
    }
    try {
      const parsed = JSON.parse(data) as Pet[];
      // Migrate legacy non-UUID storage to prevent deletion key mismatch issues
      const hasLegacyId = parsed.some(pet => !pet.id.includes("-"));
      if (hasLegacyId) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_PETS));
        localStorage.removeItem(DELETED_IDS_KEY);
        return DEFAULT_PETS;
      }
      let changed = false;
      const cleaned = parsed.map(pet => {
        let cleanImg = pet.image_url;
        let cleanVid = pet.video_url;
        // If it's a huge base64 in local storage
        if (pet.image_url && pet.image_url.startsWith("data:") && pet.image_url.length > 100000) {
          cleanImg = pet1;
          changed = true;
        }
        if (pet.video_url && pet.video_url.startsWith("data:") && pet.video_url.length > 500000) {
          cleanVid = null;
          changed = true;
        }
        return { ...pet, image_url: cleanImg, video_url: cleanVid };
      });
      if (changed) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
        return cleaned;
      }
      return parsed;
    } catch {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_PETS));
      return DEFAULT_PETS;
    }
  },

  // Helper to save to local storage
  saveLocalData(pets: Pet[]) {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pets));
    }
  },

  // GET ALL PETS
  async getPets(): Promise<Pet[]> {
    if (typeof window !== "undefined") {
      const cleanupRan = sessionStorage.getItem("pawhaven_db_cleanup_ran");
      if (!cleanupRan) {
        sessionStorage.setItem("pawhaven_db_cleanup_ran", "true");
        const badIds = ["e132fa4c-aea1-40c3-abd0-9253adf4c01e", "ebda8e22-fda3-4e77-8654-f5010f576818"];
        
        // Remove from local storage
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          try {
            const parsed = JSON.parse(local) as Pet[];
            const filtered = parsed.filter(p => !badIds.includes(p.id));
            if (filtered.length !== parsed.length) {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
            }
          } catch {}
        }
        
        // Mark as deleted locally to prevent revival
        badIds.forEach(id => {
          addDeletedPetId(id);
        });

        // Delete from Supabase tables (runs using the user's admin credentials if signed in)
        Promise.resolve(supabase.from("pets").delete().in("id", badIds)).then(() => {
          Promise.resolve(supabase.from("exotic_pets").delete().in("id", badIds)).catch(() => {});
        }).catch(() => {});
      }
    }

    const localPets = this.initLocalData();
    const deletedIds = getDeletedPetIds();

    try {
      // Query standard pets
      const petsPromise = withTimeout(
        supabase
          .from("pets")
          .select("*")
          .order("created_at", { ascending: false })
      );

      // Query exotic pets
      const exoticsPromise = withTimeout(
        supabase
          .from("exotic_pets")
          .select("*")
          .order("created_at", { ascending: false })
      );

      const [petsResult, exoticsResult] = await Promise.all([
        petsPromise.catch((err) => { console.warn("Failed standard pets fetch:", err); return { data: [], error: err }; }),
        exoticsPromise.catch((err) => { console.warn("Failed exotic pets fetch:", err); return { data: [], error: err }; }),
      ]);

      const standardData = petsResult.data || [];
      const exoticData = exoticsResult.data || [];

      let finalStandardData: any[] = [...standardData];
      let finalExoticData: any[] = [...exoticData];

      // Proactive auto-migration of misaligned pets (e.g. Exotic pets inside "pets" table)
      const misalignedExotics = standardData.filter((sp: any) => sp.type.toLowerCase() === "exotic");
      const misalignedStandards = exoticData.filter((ep: any) => ep.type.toLowerCase() !== "exotic");

      if (misalignedExotics.length > 0 && typeof window !== "undefined") {
        finalStandardData = finalStandardData.filter((sp: any) => sp.type.toLowerCase() !== "exotic");
        finalExoticData = [...finalExoticData, ...misalignedExotics];
        
        misalignedExotics.forEach(async (pet: any) => {
          console.log(`Auto-migrating exotic pet "${pet.name}" (${pet.id}) to exotic_pets table...`);
          const { error } = await supabase.from("exotic_pets").upsert({
            id: pet.id,
            name: pet.name,
            type: pet.type,
            breed: pet.breed,
            age: pet.age,
            price: pet.price,
            image_url: pet.image_url,
            video_url: pet.video_url || null,
            description: pet.description,
            vaccinated: pet.vaccinated,
            adoption: pet.adoption,
            status: pet.status,
            created_at: pet.created_at,
          });
          if (!error) {
            await supabase.from("pets").delete().eq("id", pet.id);
            console.log(`Successfully migrated exotic pet "${pet.name}".`);
          } else {
            console.warn(`Error migrating exotic pet "${pet.name}":`, error.message);
          }
        });
      }

      if (misalignedStandards.length > 0 && typeof window !== "undefined") {
        finalExoticData = finalExoticData.filter((ep: any) => ep.type.toLowerCase() === "exotic");
        finalStandardData = [...finalStandardData, ...misalignedStandards];

        misalignedStandards.forEach(async (pet: any) => {
          console.log(`Auto-migrating standard pet "${pet.name}" (${pet.id}) to pets table...`);
          const { error } = await supabase.from("pets").upsert({
            id: pet.id,
            name: pet.name,
            type: pet.type,
            breed: pet.breed,
            age: pet.age,
            price: pet.price,
            image_url: pet.image_url,
            description: pet.description,
            vaccinated: pet.vaccinated,
            adoption: pet.adoption,
            status: pet.status,
            created_at: pet.created_at,
          });
          if (!error) {
            await supabase.from("exotic_pets").delete().eq("id", pet.id);
            console.log(`Successfully migrated standard pet "${pet.name}".`);
          } else {
            console.warn(`Error migrating standard pet "${pet.name}":`, error.message);
          }
        });
      }

      // Combine both results
      const combinedRemoteData = [...finalStandardData, ...finalExoticData];

      if (petsResult.error && exoticsResult.error) {
        console.warn("Both Supabase fetches failed, using local fallback");
        const activeLocal = localPets.filter((p) => !deletedIds.includes(p.id));
        return await this.resolveLocalPetsList(activeLocal);
      }

      if (combinedRemoteData.length === 0) {
        // If Supabase is empty, seed it with local data
        console.log("Supabase tables are empty. Seeding Supabase with local data...");
        const activeLocal = localPets.filter((p) => !deletedIds.includes(p.id));
        const resolved = await this.resolveLocalPetsList(activeLocal);
        for (const pet of resolved) {
          const isExotic = pet.type.toLowerCase() === "exotic";
          if (isExotic) {
            await supabase.from("exotic_pets").insert({
              id: pet.id,
              name: pet.name,
              type: pet.type,
              breed: pet.breed,
              age: pet.age,
              price: pet.price,
              image_url: pet.image_url,
              video_url: pet.video_url,
              description: pet.description,
              vaccinated: pet.vaccinated,
              adoption: pet.adoption,
              status: pet.status,
            });
          } else {
            await supabase.from("pets").insert({
              id: pet.id,
              name: pet.name,
              type: pet.type,
              breed: pet.breed,
              age: pet.age,
              price: pet.price,
              image_url: pet.image_url,
              description: pet.description,
              vaccinated: pet.vaccinated,
              adoption: pet.adoption,
              status: pet.status,
            });
          }
        }
        return resolved;
      }

      // Filter out deleted IDs from combination
      const activeData = combinedRemoteData.filter((sp: any) => !deletedIds.includes(sp.id));

      // Merge Supabase data with local videos/details (keeping light indexeddb:// references)
      const merged = activeData.map((sp: any) => {
        const lp = localPets.find((l) => l.name.toLowerCase() === sp.name.toLowerCase() || l.id === sp.id);
        const rawImg = sp.image_url || lp?.image_url || pet1;
        const rawVid = sp.video_url || lp?.video_url || null;
        return {
          id: sp.id,
          name: sp.name,
          type: sp.type,
          breed: sp.breed || "",
          age: sp.age || "",
          price: Number(sp.price),
          image_url: rawImg,
          video_url: rawVid,
          vaccinated: !!sp.vaccinated,
          adoption: !!sp.adoption,
          status: sp.status || "available",
          description: sp.description || "",
          created_at: sp.created_at,
        };
      });

      // Find local pets that are NOT in the Supabase data (i.e. newly created locally, or pending remote sync)
      const localOnly = localPets.filter(
        (lp) => !deletedIds.includes(lp.id) && !activeData.some((sp: any) => sp.id === lp.id || sp.name.toLowerCase() === lp.name.toLowerCase())
      );

      const finalMerged = [...localOnly, ...merged];

      // Save the final merged list (containing light indexeddb:// references) back to local storage
      this.saveLocalData(finalMerged);

      // Resolve the references in memory for the UI to display them correctly
      return await this.resolveLocalPetsList(finalMerged);
    } catch (err) {
      console.warn("Error in getPets, returning local storage:", err);
      const activeLocal = localPets.filter((p) => !deletedIds.includes(p.id));
      return await this.resolveLocalPetsList(activeLocal);
    }
  },

  // Helper to resolve local pets list asynchronously
  async resolveLocalPetsList(localPets: Pet[]): Promise<Pet[]> {
    return await Promise.all(
      localPets.map(async (pet) => {
        const img = await loadMediaArrayOrSingle(pet.image_url);
        const vid = await loadMedia(pet.video_url);
        return {
          ...pet,
          image_url: img || pet.image_url,
          video_url: vid || pet.video_url,
        };
      })
    );
  },

  // GET SINGLE PET BY ID
  async getPet(id: string): Promise<Pet | null> {
    const localPets = this.initLocalData();
    const deletedIds = getDeletedPetIds();
    if (deletedIds.includes(id)) return null;

    const lp = localPets.find((p) => p.id === id);
    const isExotic = lp ? lp.type.toLowerCase() === "exotic" : false;

    try {
      if (isExotic) {
        const { data, error } = await withTimeout(
          supabase.from("exotic_pets").select("*").eq("id", id).maybeSingle()
        );

        if (error || !data) {
          // If not found in exotic_pets, try pets as fallback
          const { data: altData, error: altError } = await withTimeout(
            supabase.from("pets").select("*").eq("id", id).maybeSingle()
          );

          if (altError || !altData) {
            if (!lp) return null;
            const img = await loadMediaArrayOrSingle(lp.image_url);
            const vid = await loadMedia(lp.video_url);
            return {
              ...lp,
              image_url: img || lp.image_url,
              video_url: vid || lp.video_url,
            };
          }

          const img = await loadMediaArrayOrSingle(altData.image_url);
          const vid = await loadMedia(lp?.video_url);
          return {
            id: altData.id,
            name: altData.name,
            type: altData.type,
            breed: altData.breed || "",
            age: altData.age || "",
            price: Number(altData.price),
            image_url: img || altData.image_url || pet1,
            video_url: vid || null,
            vaccinated: !!altData.vaccinated,
            adoption: !!altData.adoption,
            status: altData.status || "available",
            description: altData.description || "",
            created_at: altData.created_at,
          };
        }

        const img = await loadMediaArrayOrSingle(data.image_url);
        const vid = await loadMedia(data.video_url || lp?.video_url);
        return {
          id: data.id,
          name: data.name,
          type: data.type,
          breed: data.breed || "",
          age: data.age || "",
          price: Number(data.price),
          image_url: img || data.image_url || pet1,
          video_url: vid || null,
          vaccinated: !!data.vaccinated,
          adoption: !!data.adoption,
          status: data.status || "available",
          description: data.description || "",
          created_at: data.created_at,
        };
      } else {
        const { data, error } = await withTimeout(
          supabase.from("pets").select("*").eq("id", id).maybeSingle()
        );

        if (error || !data) {
          // If not found in pets, try exotic_pets as fallback
          const { data: altData, error: altError } = await withTimeout(
            supabase.from("exotic_pets").select("*").eq("id", id).maybeSingle()
          );

          if (altError || !altData) {
            if (!lp) return null;
            const img = await loadMediaArrayOrSingle(lp.image_url);
            const vid = await loadMedia(lp.video_url);
            return {
              ...lp,
              image_url: img || lp.image_url,
              video_url: vid || lp.video_url,
            };
          }

          const img = await loadMediaArrayOrSingle(altData.image_url);
          const vid = await loadMedia(altData.video_url || lp?.video_url);
          return {
            id: altData.id,
            name: altData.name,
            type: altData.type,
            breed: altData.breed || "",
            age: altData.age || "",
            price: Number(altData.price),
            image_url: img || altData.image_url || pet1,
            video_url: vid || null,
            vaccinated: !!altData.vaccinated,
            adoption: !!altData.adoption,
            status: altData.status || "available",
            description: altData.description || "",
            created_at: altData.created_at,
          };
        }

        const img = await loadMediaArrayOrSingle(data.image_url);
        const vid = await loadMedia(lp?.video_url);
        return {
          id: data.id,
          name: data.name,
          type: data.type,
          breed: data.breed || "",
          age: data.age || "",
          price: Number(data.price),
          image_url: img || data.image_url || pet1,
          video_url: vid || null,
          vaccinated: !!data.vaccinated,
          adoption: !!data.adoption,
          status: data.status || "available",
          description: data.description || "",
          created_at: data.created_at,
        };
      }
    } catch (err) {
      console.warn(`Error in getPet(${id}), returning local storage pet:`, err);
      if (!lp) return null;
      const img = await loadMediaArrayOrSingle(lp.image_url);
      const vid = await loadMedia(lp.video_url);
      return {
        ...lp,
        image_url: img || lp.image_url,
        video_url: vid || lp.video_url,
      };
    }
  },

  // CREATE PET
  async createPet(petInput: Omit<Pet, "id">): Promise<Pet> {
    const localPets = this.initLocalData();
    const newId = crypto.randomUUID();

    // Store large Base64 files in IndexedDB, and store references in local storage
    const storedImageUrl = await storeMediaArrayOrSingle(`pet_img_${newId}`, petInput.image_url);
    const storedVideoUrl = petInput.video_url
      ? await storeMedia(`pet_vid_${newId}`, petInput.video_url)
      : null;

    const newPetLocal: Pet = {
      ...petInput,
      id: newId,
      image_url: storedImageUrl,
      video_url: storedVideoUrl,
      created_at: new Date().toISOString(),
    };

    const updatedPets = [newPetLocal, ...localPets];
    this.saveLocalData(updatedPets);

    // Save to Supabase (attempt with actual Base64/url values)
    const isExotic = petInput.type.toLowerCase() === "exotic";
    const payload = {
      id: newId,
      name: petInput.name,
      type: petInput.type,
      breed: petInput.breed,
      age: petInput.age,
      price: petInput.price,
      image_url: storedImageUrl,
      video_url: storedVideoUrl,
      description: petInput.description,
      vaccinated: petInput.vaccinated,
      adoption: petInput.adoption,
      status: petInput.status,
    };

    if (isExotic) {
      Promise.resolve(
        supabase.from("exotic_pets").insert([payload])
      ).then(({ error }) => {
        if (error) {
          console.warn("Could not save pet to Supabase exotic_pets table:", error.message);
        }
      }).catch((err: any) => {
        console.warn("Supabase insert failed, pet saved to local storage only:", err);
      });
    } else {
      const { video_url, ...standardPayload } = payload;
      Promise.resolve(
        supabase.from("pets").insert([standardPayload])
      ).then(({ error }) => {
        if (error) {
          console.warn("Could not save pet to Supabase pets table:", error.message);
        }
      }).catch((err: any) => {
        console.warn("Supabase insert failed, pet saved to local storage only:", err);
      });
    }

    // Return the resolved pet so client gets actual values
    return {
      ...newPetLocal,
      image_url: petInput.image_url,
      video_url: petInput.video_url,
    };
  },

  // UPDATE PET
  async updatePet(id: string, petInput: Partial<Pet>): Promise<Pet> {
    const localPets = this.initLocalData();
    const index = localPets.findIndex((p) => p.id === id);
    let updatedPet = localPets[index];

    let storedImageUrl = updatedPet ? updatedPet.image_url : petInput.image_url;
    if (petInput.image_url && (!updatedPet || petInput.image_url !== updatedPet.image_url)) {
      storedImageUrl = await storeMediaArrayOrSingle(`pet_img_${id}`, petInput.image_url);
    }

    let storedVideoUrl = updatedPet ? updatedPet.video_url : petInput.video_url;
    if (petInput.video_url !== undefined && (!updatedPet || petInput.video_url !== updatedPet.video_url)) {
      storedVideoUrl = petInput.video_url
        ? await storeMedia(`pet_vid_${id}`, petInput.video_url)
        : null;
    }

    if (index !== -1) {
      updatedPet = {
        ...localPets[index],
        ...petInput,
        image_url: storedImageUrl || localPets[index].image_url,
        video_url: storedVideoUrl !== undefined ? storedVideoUrl : localPets[index].video_url,
      };

      localPets[index] = updatedPet;
      this.saveLocalData(localPets);
    }

    // Save to Supabase (attempt)
    const newType = petInput.type || updatedPet?.type || "Dog";
    const isExoticNew = newType.toLowerCase() === "exotic";
    const isExoticOld = updatedPet ? updatedPet.type.toLowerCase() === "exotic" : false;

    // Construct the fully merged payload (to support table transfers if classification changes)
    const fullPayload = {
      id,
      name: petInput.name !== undefined ? petInput.name : (updatedPet?.name || ""),
      type: newType,
      breed: petInput.breed !== undefined ? petInput.breed : (updatedPet?.breed || ""),
      age: petInput.age !== undefined ? petInput.age : (updatedPet?.age || ""),
      price: petInput.price !== undefined ? petInput.price : (updatedPet?.price || 0),
      image_url: storedImageUrl || updatedPet?.image_url || "",
      video_url: storedVideoUrl !== undefined ? storedVideoUrl : (updatedPet?.video_url || null),
      description: petInput.description !== undefined ? petInput.description : (updatedPet?.description || ""),
      vaccinated: petInput.vaccinated !== undefined ? petInput.vaccinated : (updatedPet?.vaccinated || false),
      adoption: petInput.adoption !== undefined ? petInput.adoption : (updatedPet?.adoption || false),
      status: petInput.status !== undefined ? petInput.status : (updatedPet?.status || "available"),
    };

    if (isExoticNew !== isExoticOld) {
      // Classification changed: delete from old table, insert/upsert into new table
      if (isExoticNew) {
        // Standard -> Exotic
        Promise.resolve(supabase.from("pets").delete().eq("id", id)).catch(() => {});
        Promise.resolve(
          supabase.from("exotic_pets").upsert([fullPayload])
        ).then(({ error }) => {
          if (error) console.warn("Could not insert exotic pet during transition:", error.message);
        }).catch((err) => console.warn("Supabase transition failed:", err));
      } else {
        // Exotic -> Standard
        Promise.resolve(supabase.from("exotic_pets").delete().eq("id", id)).catch(() => {});
        const { video_url, ...standardPayload } = fullPayload;
        Promise.resolve(
          supabase.from("pets").upsert([standardPayload])
        ).then(({ error }) => {
          if (error) console.warn("Could not insert standard pet during transition:", error.message);
        }).catch((err) => console.warn("Supabase transition failed:", err));
      }
    } else {
      // Classification didn't change: just update the matching table
      if (isExoticNew) {
        Promise.resolve(
          supabase.from("exotic_pets").update(fullPayload).eq("id", id)
        ).then(({ error }) => {
          if (error) console.warn("Could not update pet in Supabase exotic_pets table:", error.message);
        }).catch((err: any) => console.warn("Supabase update failed:", err));
      } else {
        const { video_url, ...standardPayload } = fullPayload;
        Promise.resolve(
          supabase.from("pets").update(standardPayload).eq("id", id)
        ).then(({ error }) => {
          if (error) console.warn("Could not update pet in Supabase pets table:", error.message);
        }).catch((err: any) => console.warn("Supabase update failed:", err));
      }
    }

    // Return the resolved pet so client gets actual values
    return {
      ...updatedPet,
      image_url: petInput.image_url || updatedPet.image_url,
      video_url: petInput.video_url !== undefined ? petInput.video_url : updatedPet.video_url,
    };
  },

  // DELETE PET
  async deletePet(id: string): Promise<boolean> {
    const localPets = this.initLocalData();
    const petToDelete = localPets.find((p) => p.id === id);
    const isExotic = petToDelete ? petToDelete.type.toLowerCase() === "exotic" : false;

    const filtered = localPets.filter((p) => p.id !== id);
    this.saveLocalData(filtered);

    // Add to locally deleted IDs
    addDeletedPetId(id);

    // Clean up IndexedDB media
    deleteMedia(`pet_img_${id}`).catch((err: any) => console.warn("deleteMedia error:", err));
    deleteMedia(`pet_vid_${id}`).catch((err: any) => console.warn("deleteMedia error:", err));

    // Delete from Supabase (attempt)
    if (isExotic) {
      Promise.resolve(supabase.from("exotic_pets").delete().eq("id", id)).then(({ error }) => {
        if (error) {
          // Fallback delete from standard pets just in case
          Promise.resolve(supabase.from("pets").delete().eq("id", id)).catch(() => {});
        }
      }).catch((err: any) => {
        Promise.resolve(supabase.from("pets").delete().eq("id", id)).catch(() => {});
      });
    } else {
      Promise.resolve(supabase.from("pets").delete().eq("id", id)).then(({ error }) => {
        if (error) {
          // Fallback delete from exotic pets just in case
          Promise.resolve(supabase.from("exotic_pets").delete().eq("id", id)).catch(() => {});
        }
      }).catch((err: any) => {
        Promise.resolve(supabase.from("exotic_pets").delete().eq("id", id)).catch(() => {});
      });
    }

    return true;
  },

  // GET ALL CONSULTATIONS
  async getConsultations(): Promise<Consultation[]> {
    if (typeof window === "undefined") return [];
    const localVal = localStorage.getItem(CONSULTATIONS_LOCAL_KEY);
    let fallback: Consultation[] = [];
    if (localVal) {
      try {
        fallback = JSON.parse(localVal);
      } catch {
        fallback = [];
      }
    }
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("consultations")
          .select("*")
          .order("created_at", { ascending: false })
      );

      if (error) {
        console.warn("Supabase consultations fetch failed, using local fallback:", error.message);
        return fallback;
      }
      return data || fallback;
    } catch (err) {
      console.warn("Error in getConsultations, returning local fallback:", err);
      return fallback;
    }
  },

  // CREATE CONSULTATION
  async createConsultation(input: Omit<Consultation, "id">): Promise<Consultation> {
    const newId = crypto.randomUUID();
    const newConsultation: Consultation = {
      ...input,
      id: newId,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const current = localStorage.getItem(CONSULTATIONS_LOCAL_KEY);
      let list: Consultation[] = [];
      if (current) {
        try {
          list = JSON.parse(current);
        } catch {
          list = [];
        }
      }
      list.unshift(newConsultation);
      localStorage.setItem(CONSULTATIONS_LOCAL_KEY, JSON.stringify(list));
    }

    Promise.resolve(
      supabase.from("consultations").insert([
        {
          name: newConsultation.name,
          email: newConsultation.email,
          pet_type: newConsultation.pet_type,
          price_min: Number(newConsultation.price_min),
          price_max: Number(newConsultation.price_max),
        }
      ])
    ).then(({ error }) => {
      if (error) {
        console.warn("Could not save consultation to Supabase (saved locally instead):", error.message);
      }
    }).catch((err: any) => {
      console.warn("Supabase consultation insert failed, saved locally:", err);
    });

    return newConsultation;
  },

  // GET ALL LIABILITY CONSENT SUBMISSIONS
  async getConsents(): Promise<LiabilityConsent[]> {
    if (typeof window === "undefined") return [];
    const localVal = localStorage.getItem(CONSENTS_LOCAL_KEY);
    let fallback: LiabilityConsent[] = [];
    if (localVal) {
      try {
        fallback = JSON.parse(localVal);
      } catch {
        fallback = [];
      }
    }
    try {
      const { data, error } = await withTimeout<any>(
        (supabase as any)
          .from("liability_consent")
          .select("*")
          .order("created_at", { ascending: false })
      );

      if (error) {
        console.warn("Supabase liability_consent fetch failed, using local fallback:", error.message);
        return fallback;
      }
      return data || fallback;
    } catch (err) {
      console.warn("Error in getConsents, returning local fallback:", err);
      return fallback;
    }
  },

  // SUBMIT LIABILITY CONSENT
  async submitConsent(input: Omit<LiabilityConsent, "id">): Promise<LiabilityConsent> {
    const newId = safeUUID();
    const newConsent: LiabilityConsent = {
      ...input,
      id: newId,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const current = localStorage.getItem(CONSENTS_LOCAL_KEY);
      let list: LiabilityConsent[] = [];
      if (current) {
        try {
          list = JSON.parse(current);
        } catch {
          list = [];
        }
      }
      list.unshift(newConsent);
      localStorage.setItem(CONSENTS_LOCAL_KEY, JSON.stringify(list));
    }

    Promise.resolve(
      (supabase as any).from("liability_consent").insert([
        {
          id: newConsent.id,
          user_id: newConsent.user_id || null,
          full_name: newConsent.full_name,
          email: newConsent.email,
          pet_id: newConsent.pet_id || null,
          pet_name: newConsent.pet_name,
          liability_accepted: newConsent.liability_accepted,
          consent_given: newConsent.consent_given,
          signature_data_url: newConsent.signature_data_url || null,
        }
      ])
    ).then(({ error }) => {
      if (error) {
        console.warn("Could not save liability consent to Supabase (saved locally instead):", error.message);
      }
    }).catch((err: any) => {
      console.warn("Supabase liability consent insert failed, saved locally:", err);
    });

    return newConsent;
  },

  // INITIALIZE LOCAL REVIEWS
  initLocalReviews(): Review[] {
    if (typeof window === "undefined") return DEFAULT_REVIEWS;
    const stored = localStorage.getItem(REVIEWS_LOCAL_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_REVIEWS;
      }
    } else {
      localStorage.setItem(REVIEWS_LOCAL_KEY, JSON.stringify(DEFAULT_REVIEWS));
      return DEFAULT_REVIEWS;
    }
  },

  // GET REVIEWS FOR A PET
  async getReviews(petId: string): Promise<Review[]> {
    const fallback = this.initLocalReviews().filter((r) => r.petId === petId);
    try {
      const { data, error } = await withTimeout<any>(
        (supabase as any)
          .from("pet_reviews")
          .select("*")
          .eq("pet_id", petId)
          .order("created_at", { ascending: false })
      );

      if (error) {
        console.warn("Supabase pet_reviews fetch failed, returning local cache:", error.message);
        return fallback;
      }

      const remoteReviews: Review[] = (data || []).map((row: any) => ({
        id: row.id,
        petId: row.pet_id,
        author: row.author,
        rating: row.rating,
        text: row.text,
        date: row.created_at ? row.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
      }));

      if (typeof window !== "undefined") {
        const allLocal = this.initLocalReviews();
        const updated = [
          ...remoteReviews,
          ...allLocal.filter((r) => r.petId !== petId)
        ];
        localStorage.setItem(REVIEWS_LOCAL_KEY, JSON.stringify(updated));
      }

      return remoteReviews;
    } catch (err) {
      console.warn("Error fetching reviews from Supabase, using local cache fallback:", err);
      return fallback;
    }
  },

  // SUBMIT REVIEW FOR A PET
  async submitReview(input: Omit<Review, "id" | "date">): Promise<Review> {
    const newId = safeUUID();
    const newDate = new Date().toISOString().split("T")[0];
    const newReview: Review = {
      ...input,
      id: newId,
      date: newDate,
    };

    if (typeof window !== "undefined") {
      const allLocal = this.initLocalReviews();
      const updated = [newReview, ...allLocal];
      localStorage.setItem(REVIEWS_LOCAL_KEY, JSON.stringify(updated));
    }

    Promise.resolve(
      (supabase as any).from("pet_reviews").insert([
        {
          id: newReview.id,
          pet_id: newReview.petId,
          author: newReview.author,
          rating: newReview.rating,
          text: newReview.text,
        }
      ])
    ).then(({ error }) => {
      if (error) {
        console.warn("Could not save review to Supabase (saved locally instead):", error.message);
      }
    }).catch((err: any) => {
      console.warn("Supabase review insert failed, saved locally:", err);
    });

    return newReview;
  },

  // UPDATE REVIEW
  async updateReview(id: string, petId: string, rating: number, text: string): Promise<Review> {
    if (typeof window !== "undefined") {
      const allLocal = this.initLocalReviews();
      const updated = allLocal.map((r) => {
        if (r.id === id) {
          return { ...r, rating, text };
        }
        return r;
      });
      localStorage.setItem(REVIEWS_LOCAL_KEY, JSON.stringify(updated));
    }

    Promise.resolve(
      (supabase as any)
        .from("pet_reviews")
        .update({ rating, text })
        .eq("id", id)
    ).then(({ error }) => {
      if (error) {
        console.warn("Could not update review in Supabase (updated locally instead):", error.message);
      }
    }).catch((err: any) => {
      console.warn("Supabase review update failed, updated locally:", err);
    });

    const allLocal = this.initLocalReviews();
    const updatedReview = allLocal.find((r) => r.id === id);
    if (!updatedReview) {
      throw new Error(`Review with id ${id} not found after local update`);
    }
    return updatedReview;
  },

  // DELETE REVIEW
  async deleteReview(id: string, petId: string): Promise<void> {
    if (typeof window !== "undefined") {
      const allLocal = this.initLocalReviews();
      const updated = allLocal.filter((r) => r.id !== id);
      localStorage.setItem(REVIEWS_LOCAL_KEY, JSON.stringify(updated));
    }

    Promise.resolve(
      (supabase as any)
        .from("pet_reviews")
        .delete()
        .eq("id", id)
    ).then(({ error }) => {
      if (error) {
        console.warn("Could not delete review from Supabase (deleted locally instead):", error.message);
      }
    }).catch((err: any) => {
      console.warn("Supabase review delete failed, deleted locally:", err);
    });
  },

  // ─── TRAINING BOOKINGS ───────────────────────────────────────────

  // GET ALL TRAINING BOOKINGS (admin view — returns full details)
  getTrainingBookings(): TrainingBooking[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(TRAINING_BOOKINGS_LOCAL_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored) as TrainingBooking[];
    } catch {
      return [];
    }
  },

  // GET BOOKED DATES ONLY (user view — no personal data exposed)
  getBookedDates(maxPerDay: number = 3): { bookedDates: string[]; dateCounts: Record<string, number> } {
    const bookings = this.getTrainingBookings();
    const counts: Record<string, number> = {};
    for (const b of bookings) {
      counts[b.preferredDate] = (counts[b.preferredDate] || 0) + 1;
    }
    const bookedDates = Object.entries(counts)
      .filter(([, count]) => count >= maxPerDay)
      .map(([date]) => date);
    return { bookedDates, dateCounts: counts };
  },

  // CREATE TRAINING BOOKING
  createTrainingBooking(input: Omit<TrainingBooking, "id" | "createdAt">): TrainingBooking {
    const newId = safeUUID();
    const newBooking: TrainingBooking = {
      ...input,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const current = localStorage.getItem(TRAINING_BOOKINGS_LOCAL_KEY);
      let list: TrainingBooking[] = [];
      if (current) {
        try {
          list = JSON.parse(current);
        } catch {
          list = [];
        }
      }
      list.unshift(newBooking);
      localStorage.setItem(TRAINING_BOOKINGS_LOCAL_KEY, JSON.stringify(list));
    }

    return newBooking;
  },

  // DELETE TRAINING BOOKING (admin action)
  deleteTrainingBooking(id: string): boolean {
    if (typeof window === "undefined") return false;
    const bookings = this.getTrainingBookings();
    const filtered = bookings.filter((b) => b.id !== id);
    localStorage.setItem(TRAINING_BOOKINGS_LOCAL_KEY, JSON.stringify(filtered));
    return true;
  },
};
