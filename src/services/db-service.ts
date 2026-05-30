import { supabase } from "@/integrations/supabase/client";
import pet1 from "@/assets/pet-1.jpg";
import pet2 from "@/assets/pet-2.jpg";
import pet3 from "@/assets/pet-3.jpg";
import pet4 from "@/assets/pet-4.jpg";
import scarletMacaw from "@/assets/scarlet-macaw.png";
import sugarGlider from "@/assets/sugar-glider.png";
import chameleon from "@/assets/chameleon.png";

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

const withTimeout = <T>(promise: PromiseLike<T>, ms = 3000): Promise<T> => {
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

const LOCAL_STORAGE_KEY = "pawhaven_pets";
const CONSULTATIONS_LOCAL_KEY = "pawhaven_consultations";

// Default seed data matching sample.ts, plus video placeholders
const DEFAULT_PETS: Pet[] = [
  {
    id: "milo",
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
    id: "luna",
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
    id: "biscuit",
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
    id: "kiwi",
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
    id: "rosie",
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
    id: "mochi",
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
    id: "major",
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
    id: "ziggy",
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
    id: "peanut",
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
    const localPets = this.initLocalData();

    try {
      const { data, error } = await withTimeout(
        supabase
          .from("pets")
          .select("*")
          .order("created_at", { ascending: false })
      );

      if (error) {
        console.warn("Supabase fetch failed, using local fallback:", error.message);
        return await this.resolveLocalPetsList(localPets);
      }

      if (!data || data.length === 0) {
        // If Supabase is empty, seed it with local data
        console.log("Supabase table is empty. Seeding Supabase with local data...");
        const resolved = await this.resolveLocalPetsList(localPets);
        for (const pet of resolved) {
          // Try to insert with video_url first; if the column doesn't exist, insert without it
          const { error } = await supabase.from("pets").insert({
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
          } as any);
          if (error && (error.message.includes("column") || error.message.includes("video_url"))) {
            const { video_url, ...supabasePet } = pet;
            await supabase.from("pets").insert({
              ...supabasePet,
              id: undefined,
            });
          }
        }
        return resolved;
      }

      // Merge Supabase data with local videos (since Supabase might not store video_url)
      const merged = await Promise.all(
        data.map(async (sp: any) => {
          const lp = localPets.find((l) => l.name.toLowerCase() === sp.name.toLowerCase());
          const img = await loadMediaArrayOrSingle(sp.image_url);
          const vid = await loadMedia(sp.video_url || lp?.video_url);
          return {
            id: sp.id,
            name: sp.name,
            type: sp.type,
            breed: sp.breed || "",
            age: sp.age || "",
            price: Number(sp.price),
            image_url: img || sp.image_url || pet1,
            video_url: vid || null,
            vaccinated: !!sp.vaccinated,
            adoption: !!sp.adoption,
            status: sp.status || "available",
            description: sp.description || "",
            created_at: sp.created_at,
          };
        })
      );

      return merged;
    } catch (err) {
      console.warn("Error in getPets, returning local storage:", err);
      return await this.resolveLocalPetsList(localPets);
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

    try {
      const { data, error } = await withTimeout(
        supabase.from("pets").select("*").eq("id", id).maybeSingle()
      );

      if (error || !data) {
        // Fallback to local storage
        const lp = localPets.find((p) => p.id === id);
        if (!lp) return null;
        const img = await loadMediaArrayOrSingle(lp.image_url);
        const vid = await loadMedia(lp.video_url);
        return {
          ...lp,
          image_url: img || lp.image_url,
          video_url: vid || lp.video_url,
        };
      }

      const lp = localPets.find(
        (l) => l.name.toLowerCase() === data.name.toLowerCase() || l.id === data.id,
      );
      const img = await loadMediaArrayOrSingle(data.image_url);
      const vid = await loadMedia((data as any).video_url || lp?.video_url);
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
    } catch (err) {
      console.warn(`Error in getPet(${id}), returning local storage pet:`, err);
      const lp = localPets.find((p) => p.id === id);
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
    Promise.resolve(
      supabase.from("pets").insert([
        {
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
        },
      ] as any)
    ).then(({ error }) => {
      if (error) {
        if (error.message.includes("column") || error.message.includes("video_url")) {
          console.warn(
            "video_url column is missing in Supabase pets table. Retrying insert without it...",
          );
          const { video_url, ...supabasePayload } = petInput;
          Promise.resolve(
            supabase.from("pets").insert([{
              ...supabasePayload,
              image_url: storedImageUrl
            }])
          ).then(({ error: retryError }) => {
            if (retryError) console.warn("Retry failed:", retryError.message);
          }).catch((err: any) => {
            console.warn("Retry error:", err);
          });
        } else {
          console.warn("Could not save pet to Supabase (saved locally instead):", error.message);
        }
      }
    }).catch((err: any) => {
      console.warn("Supabase insert failed, pet saved to local storage only:", err);
    });

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
    Promise.resolve(
      supabase
        .from("pets")
        .update({
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
        } as any)
        .eq("id", id)
    ).then(({ error }) => {
      if (error) {
        if (error.message.includes("column") || error.message.includes("video_url")) {
          console.warn(
            "video_url column is missing in Supabase pets table. Retrying update without it...",
          );
          const { video_url, id: _id, created_at: _c, ...supabasePayload } = petInput;
          Promise.resolve(
            supabase
              .from("pets")
              .update({
                ...supabasePayload,
                image_url: storedImageUrl
              })
              .eq("id", id)
          ).then(({ error: retryError }) => {
            if (retryError) console.warn("Retry failed:", retryError.message);
          }).catch((err: any) => {
            console.warn("Retry error:", err);
          });
        } else {
          console.warn(
            "Could not update pet in Supabase (updated locally instead):",
            error.message,
          );
        }
      }
    }).catch((err: any) => {
      console.warn("Supabase update failed, pet updated in local storage only:", err);
    });

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
    const filtered = localPets.filter((p) => p.id !== id);
    this.saveLocalData(filtered);

    // Clean up IndexedDB media
    deleteMedia(`pet_img_${id}`).catch((err: any) => console.warn("deleteMedia error:", err));
    deleteMedia(`pet_vid_${id}`).catch((err: any) => console.warn("deleteMedia error:", err));

    // Delete from Supabase (attempt)
    Promise.resolve(supabase.from("pets").delete().eq("id", id)).then(({ error }) => {
      if (error) {
        console.warn(
          "Could not delete pet from Supabase (deleted locally instead):",
          error.message,
        );
      }
    }).catch((err: any) => {
      console.warn("Supabase delete failed, pet deleted from local storage only:", err);
    });

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
};
