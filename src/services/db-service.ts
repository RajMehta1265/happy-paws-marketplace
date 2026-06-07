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

const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(";base64,");
  const contentType = parts[0].split(":")[1] || "image/jpeg";
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
};

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

// Preload all media from IndexedDB into mediaCache as Blob URLs on app startup
if (typeof window !== "undefined") {
  (async () => {
    try {
      const db = await openIndexedDB();
      const tx = db.transaction("media", "readonly");
      const store = tx.objectStore("media");
      const req = store.openCursor();
      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          if (typeof val === "string" && val.startsWith("data:")) {
            try {
              const blob = base64ToBlob(val);
              mediaCache[cursor.key] = URL.createObjectURL(blob);
            } catch {
              mediaCache[cursor.key] = val;
            }
          } else {
            mediaCache[cursor.key] = val;
          }
          cursor.continue();
        }
      };
    } catch (e) {
      console.warn("Failed to preload media cache:", e);
    }
  })();
}

// Background media pruner disabled to prevent user-uploaded images and videos from being deleted from IndexedDB cache
// if (typeof window !== "undefined") {
//   setTimeout(async () => {
//     try {
//       const db = await openIndexedDB();
//       const tx = db.transaction("media", "readwrite");
//       const store = tx.objectStore("media");
//       const req = store.openCursor();
//       req.onsuccess = (e: any) => {
//         const cursor = e.target.result;
//         if (cursor) {
//           const value = cursor.value;
//           if (typeof value === "string" && value.length > 2 * 1024 * 1024) {
//             console.log(`Pruning large IndexedDB media key: ${cursor.key} (size: ${value.length})`);
//             cursor.delete();
//           }
//           cursor.continue();
//         }
//       };
//     } catch (e) {
//       console.warn("IndexedDB background pruning failed:", e);
//     }
//   }, 2000);
// }

const storeMedia = async (key: string, value: string): Promise<string> => {
  if (typeof window === "undefined" || !value || !value.startsWith("data:")) return value;
  try {
    const blob = base64ToBlob(value);
    mediaCache[key] = URL.createObjectURL(blob);
  } catch {
    mediaCache[key] = value;
  }
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
  if (!value) return null;
  if (
    value.startsWith("blob:") ||
    (!value.startsWith("indexeddb://") && !value.startsWith("data:"))
  ) {
    return value;
  }
  if (value.startsWith("data:")) {
    try {
      const blob = base64ToBlob(value);
      return URL.createObjectURL(blob);
    } catch {
      return value;
    }
  }
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
    if (result && result.startsWith("data:")) {
      try {
        const blob = base64ToBlob(result);
        const blobUrl = URL.createObjectURL(blob);
        mediaCache[key] = blobUrl;
        return blobUrl;
      } catch {
        mediaCache[key] = result;
        return result;
      }
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
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
};

export const parseImages = (imageUrlString: string | null | undefined): string[] => {
  if (!imageUrlString) return ["/pet-1.jpg"];
  const trimmed = imageUrlString.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          if (typeof item === "string" && item.startsWith("indexeddb://")) {
            const key = item.replace("indexeddb://", "");
            return mediaCache[key] || "/pet-1.jpg";
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
    return [mediaCache[key] || "/pet-1.jpg"];
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
          }),
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
          }),
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
  breed?: string | null;
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
  completed?: boolean;
  liabilityAccepted?: boolean;
  consentGiven?: boolean;
  signatureDataUrl?: string | null;
}

export interface HostellingBooking {
  id: string;
  user_id: string | null;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  petName: string;
  petBreed: string;
  petGender: "Male" | "Female";
  petAge: string;
  medicalConditions: string;
  medicalImage: string;
  temperament: "Friendly" | "Aggressive";
  aggressionDetails?: string;
  urineTrained: boolean;
  pottyTrained: boolean;
  checkInDate: string;
  checkOutDate: string;
  numDays: number;
  signatureDataUrl: string;
  completed: boolean;
  createdAt: string;
  submittedAt?: string;
}

const LOCAL_STORAGE_KEY = "pawhaven_pets";
const CONSULTATIONS_LOCAL_KEY = "pawhaven_consultations";
const CONSENTS_LOCAL_KEY = "pawhaven_liability_consent";
const REVIEWS_LOCAL_KEY = "pawhaven_pet_reviews";
const TRAINING_BOOKINGS_LOCAL_KEY = "pawhaven_training_bookings";
const HOSTELLING_BOOKINGS_LOCAL_KEY = "pawhaven_hostelling_bookings_list";

const DEFAULT_REVIEWS: Review[] = [];

// Default seed data is empty to prevent static seeding
const DEFAULT_PETS: Pet[] = [];

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
      const hasLegacyId = parsed.some((pet) => !pet.id.includes("-"));
      if (hasLegacyId) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_PETS));
        localStorage.removeItem(DELETED_IDS_KEY);
        return DEFAULT_PETS;
      }
      let changed = false;
      const filtered = parsed.filter((pet) => pet.name.toLowerCase() !== "bella");
      if (filtered.length !== parsed.length) {
        changed = true;
      }
      const cleaned = filtered.map((pet) => {
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
    const isMock = typeof window !== "undefined" && !!localStorage.getItem("pawhaven_mock_session");
    const localPets = this.initLocalData();
    const deletedIds = getDeletedPetIds();

    if (isMock) {
      const activeLocal = localPets.filter((p) => !deletedIds.includes(p.id));
      return await this.resolveLocalPetsList(activeLocal);
    }

    if (typeof window !== "undefined") {
      const cleanupRan = sessionStorage.getItem("pawhaven_db_cleanup_ran");
      if (!cleanupRan) {
        sessionStorage.setItem("pawhaven_db_cleanup_ran", "true");
        const badIds = [
          "e132fa4c-aea1-40c3-abd0-9253adf4c01e",
          "ebda8e22-fda3-4e77-8654-f5010f576818",
        ];

        // Remove from local storage
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          try {
            const parsed = JSON.parse(local) as Pet[];
            const filtered = parsed.filter((p) => !badIds.includes(p.id));
            if (filtered.length !== parsed.length) {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
            }
          } catch {}
        }

        // Mark as deleted locally to prevent revival
        badIds.forEach((id) => {
          addDeletedPetId(id);
        });

        // Delete from Supabase tables (runs using the user's admin credentials if signed in)
        Promise.resolve(supabase.from("pets").delete().in("id", badIds))
          .then(() => {
            Promise.resolve(supabase.from("exotic_pets").delete().in("id", badIds)).catch(() => {});
          })
          .catch(() => {});
      }
    }

    try {
      // Query standard pets
      const petsPromise = withTimeout(
        supabase.from("pets").select("*").order("created_at", { ascending: false }),
      );

      // Query exotic pets
      const exoticsPromise = withTimeout(
        supabase.from("exotic_pets").select("*").order("created_at", { ascending: false }),
      );

      const [petsResult, exoticsResult] = await Promise.all([
        petsPromise.catch((err) => {
          console.warn("Failed standard pets fetch:", err);
          return { data: [], error: err };
        }),
        exoticsPromise.catch((err) => {
          console.warn("Failed exotic pets fetch:", err);
          return { data: [], error: err };
        }),
      ]);

      const standardData = petsResult.data || [];
      const exoticData = exoticsResult.data || [];

      let finalStandardData: any[] = [...standardData];
      let finalExoticData: any[] = [...exoticData];

      // Proactive auto-migration of misaligned pets (e.g. Exotic pets inside "pets" table)
      const misalignedExotics = standardData.filter(
        (sp: any) => sp.type.toLowerCase() === "exotic",
      );
      const misalignedStandards = exoticData.filter(
        (ep: any) => ep.type.toLowerCase() !== "exotic",
      );

      if (misalignedExotics.length > 0 && typeof window !== "undefined") {
        finalStandardData = finalStandardData.filter(
          (sp: any) => sp.type.toLowerCase() !== "exotic",
        );
        finalExoticData = [...finalExoticData, ...misalignedExotics];

        misalignedExotics.forEach(async (pet: any) => {
          console.log(
            `Auto-migrating exotic pet "${pet.name}" (${pet.id}) to exotic_pets table...`,
          );
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

      // Seeding block removed to prevent auto-populating static data when DB is empty

      // Filter out deleted IDs from combination
      const activeData = combinedRemoteData.filter((sp: any) => !deletedIds.includes(sp.id));

      // Merge Supabase data with local videos/details (keeping light indexeddb:// references)
      const mergedRaw = activeData.map((sp: any) => {
        const lp = localPets.find(
          (l) => l.name.toLowerCase() === sp.name.toLowerCase() || l.id === sp.id,
        );
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

      // Cache base64 media from Supabase into IndexedDB and convert to indexeddb:// references
      const merged = await Promise.all(mergedRaw.map((p) => this.cacheRemoteMedia(p)));

      // Save the final merged list (containing light indexeddb:// references) back to local storage
      this.saveLocalData(merged);

      // Resolve the references in memory for the UI to display them correctly
      return await this.resolveLocalPetsList(merged);
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
      }),
    );
  },

  // Helper to cache remote base64 media into IndexedDB
  async cacheRemoteMedia(pet: any): Promise<any> {
    let image_url = pet.image_url;
    let video_url = pet.video_url;

    if (
      image_url &&
      (image_url.startsWith("data:") || (image_url.startsWith("[") && image_url.includes("data:")))
    ) {
      image_url = await storeMediaArrayOrSingle(`pet_img_${pet.id}`, image_url);
    }
    if (video_url && video_url.startsWith("data:")) {
      video_url = await storeMedia(`pet_vid_${pet.id}`, video_url);
    }

    return {
      ...pet,
      image_url,
      video_url,
    };
  },

  // Helper to sync any local-only pets to Supabase
  async syncLocalOnlyPets(): Promise<void> {
    if (typeof window === "undefined") return;
    const localPets = this.initLocalData();
    const deletedIds = getDeletedPetIds();

    try {
      const { data: standardData, error: standardError } = await supabase
        .from("pets")
        .select("id, name");
      const { data: exoticData, error: exoticError } = await supabase
        .from("exotic_pets")
        .select("id, name");

      if (standardError || exoticError) {
        console.warn("Failed to fetch remote pets for sync check:", standardError || exoticError);
        return;
      }

      const remoteIds = new Set([
        ...(standardData || []).map((p: any) => p.id),
        ...(exoticData || []).map((p: any) => p.id),
      ]);
      const remoteNames = new Set([
        ...(standardData || []).map((p: any) => p.name.toLowerCase()),
        ...(exoticData || []).map((p: any) => p.name.toLowerCase()),
      ]);

      const localOnly = localPets.filter(
        (lp) =>
          !deletedIds.includes(lp.id) &&
          !remoteIds.has(lp.id) &&
          !remoteNames.has(lp.name.toLowerCase()),
      );

      if (localOnly.length === 0) {
        console.log("No local-only pets to sync.");
        return;
      }

      console.log(
        `Syncing ${localOnly.length} local-only pets to Supabase:`,
        localOnly.map((p) => p.name),
      );

      for (const pet of localOnly) {
        const resolvedImg = await loadMediaArrayOrSingle(pet.image_url);
        const resolvedVid = await loadMedia(pet.video_url);

        const isExotic = pet.type.toLowerCase() === "exotic";
        const payload = {
          id: pet.id,
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          age: pet.age,
          price: pet.price,
          image_url: resolvedImg || pet.image_url,
          video_url: resolvedVid || pet.video_url || null,
          description: pet.description,
          vaccinated: pet.vaccinated,
          adoption: pet.adoption,
          status: pet.status,
        };

        if (isExotic) {
          const { error } = await supabase.from("exotic_pets").insert([payload]);
          if (error) {
            console.warn(`Sync failed for exotic pet "${pet.name}":`, error.message);
          } else {
            console.log(`Successfully synced exotic pet "${pet.name}" to Supabase.`);
          }
        } else {
          const { error } = await (supabase.from("pets") as any).insert([payload]);
          if (error) {
            console.warn(`Sync failed for pet "${pet.name}":`, error.message);
          } else {
            console.log(`Successfully synced pet "${pet.name}" to Supabase.`);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to check/sync local-only pets:", err);
    }
  },

  // GET SINGLE PET BY ID
  async getPet(id: string): Promise<Pet | null> {
    const localPets = this.initLocalData();
    const deletedIds = getDeletedPetIds();
    if (deletedIds.includes(id)) return null;

    const isMock = typeof window !== "undefined" && !!localStorage.getItem("pawhaven_mock_session");
    const lp = localPets.find((p) => p.id === id);

    if (isMock) {
      if (!lp) return null;
      const img = await loadMediaArrayOrSingle(lp.image_url);
      const vid = await loadMedia(lp.video_url);
      return {
        ...lp,
        image_url: img || lp.image_url,
        video_url: vid || lp.video_url,
      };
    }

    const isExotic = lp ? lp.type.toLowerCase() === "exotic" : false;

    try {
      if (isExotic) {
        const { data, error } = await withTimeout(
          supabase.from("exotic_pets").select("*").eq("id", id).maybeSingle(),
        );

        if (error || !data) {
          // If not found in exotic_pets, try pets as fallback
          const { data: altData, error: altError } = await withTimeout(
            supabase.from("pets").select("*").eq("id", id).maybeSingle(),
          );

          if (altError || !altData) {
            return null;
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
          supabase.from("pets").select("*").eq("id", id).maybeSingle(),
        );

        if (error || !data) {
          // If not found in pets, try exotic_pets as fallback
          const { data: altData, error: altError } = await withTimeout(
            supabase.from("exotic_pets").select("*").eq("id", id).maybeSingle(),
          );

          if (altError || !altData) {
            return null;
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
      image_url: petInput.image_url,
      video_url: petInput.video_url,
      description: petInput.description,
      vaccinated: petInput.vaccinated,
      adoption: petInput.adoption,
      status: petInput.status,
    };

    if (isExotic) {
      const { error } = await supabase.from("exotic_pets").insert([payload]);
      if (error) {
        throw new Error(`Failed to save exotic pet to database: ${error.message}`);
      }
    } else {
      const { error } = await (supabase.from("pets") as any).insert([payload]);
      if (error) {
        throw new Error(`Failed to save pet to database: ${error.message}`);
      }
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

    const currentBase64Img = updatedPet ? await loadMediaArrayOrSingle(updatedPet.image_url) : null;
    const currentBase64Vid = updatedPet ? await loadMedia(updatedPet.video_url) : null;

    const hasImageChanged =
      petInput.image_url !== undefined &&
      petInput.image_url !== currentBase64Img &&
      petInput.image_url !== updatedPet?.image_url;
    const hasVideoChanged =
      petInput.video_url !== undefined &&
      petInput.video_url !== currentBase64Vid &&
      petInput.video_url !== updatedPet?.video_url;

    let storedImageUrl = updatedPet ? updatedPet.image_url : petInput.image_url;
    if (hasImageChanged && petInput.image_url) {
      storedImageUrl = await storeMediaArrayOrSingle(`pet_img_${id}`, petInput.image_url);
    }

    let storedVideoUrl = updatedPet ? updatedPet.video_url : petInput.video_url;
    if (hasVideoChanged) {
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

    if (isExoticNew !== isExoticOld) {
      // Classification changed: delete from old table, insert/upsert into new table
      // Construct the fully merged payload (to support table transfers if classification changes)
      const fullPayload = {
        id,
        name: petInput.name !== undefined ? petInput.name : updatedPet?.name || "",
        type: newType,
        breed: petInput.breed !== undefined ? petInput.breed : updatedPet?.breed || "",
        age: petInput.age !== undefined ? petInput.age : updatedPet?.age || "",
        price: petInput.price !== undefined ? petInput.price : updatedPet?.price || 0,
        image_url:
          petInput.image_url !== undefined
            ? petInput.image_url
            : currentBase64Img || updatedPet?.image_url || "",
        video_url:
          petInput.video_url !== undefined
            ? petInput.video_url
            : currentBase64Vid || updatedPet?.video_url || null,
        description:
          petInput.description !== undefined ? petInput.description : updatedPet?.description || "",
        vaccinated:
          petInput.vaccinated !== undefined ? petInput.vaccinated : updatedPet?.vaccinated || false,
        adoption:
          petInput.adoption !== undefined ? petInput.adoption : updatedPet?.adoption || false,
        status: petInput.status !== undefined ? petInput.status : updatedPet?.status || "available",
      };

      if (isExoticNew) {
        // Standard -> Exotic
        await supabase.from("pets").delete().eq("id", id);
        const { error } = await supabase.from("exotic_pets").upsert([fullPayload]);
        if (error) throw new Error(`Failed to save exotic pet: ${error.message}`);
      } else {
        // Exotic -> Standard
        await supabase.from("exotic_pets").delete().eq("id", id);
        const { error } = await (supabase.from("pets") as any).upsert([fullPayload]);
        if (error) throw new Error(`Failed to save pet: ${error.message}`);
      }
    } else {
      // Classification didn't change: just update the matching table using partial payload (extremely fast!)
      const partialPayload: any = {};
      if (petInput.name !== undefined) partialPayload.name = petInput.name;
      if (petInput.type !== undefined) partialPayload.type = petInput.type;
      if (petInput.breed !== undefined) partialPayload.breed = petInput.breed;
      if (petInput.age !== undefined) partialPayload.age = petInput.age;
      if (petInput.price !== undefined) partialPayload.price = petInput.price;
      if (hasImageChanged) partialPayload.image_url = petInput.image_url;
      if (hasVideoChanged) partialPayload.video_url = petInput.video_url;
      if (petInput.description !== undefined) partialPayload.description = petInput.description;
      if (petInput.vaccinated !== undefined) partialPayload.vaccinated = petInput.vaccinated;
      if (petInput.adoption !== undefined) partialPayload.adoption = petInput.adoption;
      if (petInput.status !== undefined) partialPayload.status = petInput.status;

      if (Object.keys(partialPayload).length > 0) {
        if (isExoticNew) {
          const { error } = await supabase.from("exotic_pets").update(partialPayload).eq("id", id);
          if (error) throw new Error(`Failed to update exotic pet: ${error.message}`);
        } else {
          const { error } = await (supabase.from("pets") as any)
            .update(partialPayload)
            .eq("id", id);
          if (error) throw new Error(`Failed to update pet: ${error.message}`);
        }
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
      Promise.resolve(supabase.from("exotic_pets").delete().eq("id", id))
        .then(({ error }) => {
          if (error) {
            // Fallback delete from standard pets just in case
            Promise.resolve(supabase.from("pets").delete().eq("id", id)).catch(() => {});
          }
        })
        .catch((err: any) => {
          Promise.resolve(supabase.from("pets").delete().eq("id", id)).catch(() => {});
        });
    } else {
      Promise.resolve(supabase.from("pets").delete().eq("id", id))
        .then(({ error }) => {
          if (error) {
            // Fallback delete from exotic pets just in case
            Promise.resolve(supabase.from("exotic_pets").delete().eq("id", id)).catch(() => {});
          }
        })
        .catch((err: any) => {
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
      const { data, error } = await withTimeout<any>(
        (supabase as any)
          .from("consultations")
          .select("*")
          .order("created_at", { ascending: false }),
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

    try {
      const { error } = await (supabase as any).from("consultations").insert([
        {
          name: newConsultation.name,
          email: newConsultation.email,
          pet_type: newConsultation.pet_type,
          breed: newConsultation.breed,
          price_min: Number(newConsultation.price_min),
          price_max: Number(newConsultation.price_max),
        },
      ]);
      if (error) {
        console.warn(
          "Could not save consultation to Supabase (saved locally instead):",
          error.message,
        );
      }
    } catch (err: any) {
      console.warn("Supabase consultation insert failed, saved locally:", err);
    }

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
          .order("created_at", { ascending: false }),
      );

      if (error) {
        console.warn(
          "Supabase liability_consent fetch failed, using local fallback:",
          error.message,
        );
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
        },
      ]),
    )
      .then(({ error }) => {
        if (error) {
          console.warn(
            "Could not save liability consent to Supabase (saved locally instead):",
            error.message,
          );
        }
      })
      .catch((err: any) => {
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
          .order("created_at", { ascending: false }),
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
        date: row.created_at
          ? row.created_at.split("T")[0]
          : new Date().toISOString().split("T")[0],
      }));

      if (typeof window !== "undefined") {
        const allLocal = this.initLocalReviews();
        const updated = [...remoteReviews, ...allLocal.filter((r) => r.petId !== petId)];
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

    try {
      const { error } = await (supabase as any).from("pet_reviews").insert([
        {
          id: newReview.id,
          pet_id: newReview.petId,
          author: newReview.author,
          rating: newReview.rating,
          text: newReview.text,
        },
      ]);
      if (error) {
        console.warn("Could not save review to Supabase (saved locally instead):", error.message);
      }
    } catch (err: any) {
      console.warn("Supabase review insert failed, saved locally:", err);
    }

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

    try {
      const { error } = await (supabase as any)
        .from("pet_reviews")
        .update({ rating, text })
        .eq("id", id);
      if (error) {
        console.warn(
          "Could not update review in Supabase (updated locally instead):",
          error.message,
        );
      }
    } catch (err: any) {
      console.warn("Supabase review update failed, updated locally:", err);
    }

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

    try {
      const { error } = await (supabase as any).from("pet_reviews").delete().eq("id", id);
      if (error) {
        console.warn(
          "Could not delete review from Supabase (deleted locally instead):",
          error.message,
        );
      }
    } catch (err: any) {
      console.warn("Supabase review delete failed, deleted locally:", err);
    }
  },

  // ─── TRAINING BOOKINGS ───────────────────────────────────────────

  // GET ALL TRAINING BOOKINGS (admin view — returns full details)
  async getTrainingBookings(): Promise<TrainingBooking[]> {
    if (typeof window === "undefined") return [];
    const localVal = localStorage.getItem(TRAINING_BOOKINGS_LOCAL_KEY);
    let fallback: TrainingBooking[] = [];
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
          .from("training_bookings")
          .select("*")
          .order("created_at", { ascending: false }),
      );

      if (error) {
        console.warn(
          "Supabase training_bookings fetch failed, using local fallback:",
          error.message,
        );
        return fallback;
      }

      const remoteBookings: TrainingBooking[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        ownerName: row.owner_name,
        petName: row.pet_name,
        breed: row.breed || "",
        age: row.age || "",
        trainingType: row.training_type as "Basic" | "Moderate" | "Advance",
        preferredDate: row.preferred_date,
        selectedCommands: row.selected_commands || [],
        medicalConditions: row.medical_conditions || "",
        createdAt: row.created_at,
        completed: !!row.completed,
        liabilityAccepted: row.liability_accepted,
        consentGiven: row.consent_given,
        signatureDataUrl: row.signature_data_url,
      }));

      localStorage.setItem(TRAINING_BOOKINGS_LOCAL_KEY, JSON.stringify(remoteBookings));
      return remoteBookings;
    } catch (err) {
      console.warn("Error in getTrainingBookings, returning local fallback:", err);
      return fallback;
    }
  },

  // GET BOOKED DATES ONLY (user view — no personal data exposed, uses RPC)
  async getBookedDates(
    maxPerDay: number = 3,
  ): Promise<{ bookedDates: string[]; dateCounts: Record<string, number> }> {
    try {
      const { data, error } = await withTimeout<any>(
        (supabase as any).rpc("get_training_date_counts"),
      );

      if (error) {
        console.warn("Supabase RPC failed, calculating from local cache:", error.message);
        const bookings = await this.getTrainingBookings();
        const counts: Record<string, number> = {};
        for (const b of bookings) {
          counts[b.preferredDate] = (counts[b.preferredDate] || 0) + 1;
        }
        const bookedDates = Object.entries(counts)
          .filter(([, count]) => count >= maxPerDay)
          .map(([date]) => date);
        return { bookedDates, dateCounts: counts };
      }

      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        counts[row.preferred_date] = Number(row.booking_count);
      });
      const bookedDates = Object.entries(counts)
        .filter(([, count]) => count >= maxPerDay)
        .map(([date]) => date);
      return { bookedDates, dateCounts: counts };
    } catch (err) {
      console.warn("Error in getBookedDates, using local fallback:", err);
      const bookings = await this.getTrainingBookings();
      const counts: Record<string, number> = {};
      for (const b of bookings) {
        counts[b.preferredDate] = (counts[b.preferredDate] || 0) + 1;
      }
      const bookedDates = Object.entries(counts)
        .filter(([, count]) => count >= maxPerDay)
        .map(([date]) => date);
      return { bookedDates, dateCounts: counts };
    }
  },

  // CREATE TRAINING BOOKING
  async createTrainingBooking(
    input: Omit<TrainingBooking, "id" | "createdAt" | "completed">,
  ): Promise<TrainingBooking> {
    const newId = safeUUID();
    const newBooking: TrainingBooking = {
      ...input,
      id: newId,
      createdAt: new Date().toISOString(),
      completed: false,
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

    Promise.resolve(
      (supabase as any).from("training_bookings").insert([
        {
          id: newBooking.id,
          user_id: newBooking.user_id || null,
          owner_name: newBooking.ownerName,
          pet_name: newBooking.petName,
          breed: newBooking.breed,
          age: newBooking.age,
          training_type: newBooking.trainingType,
          preferred_date: newBooking.preferredDate,
          selected_commands: newBooking.selectedCommands,
          medical_conditions: newBooking.medicalConditions,
          completed: false,
          liability_accepted: newBooking.liabilityAccepted || false,
          consent_given: newBooking.consentGiven || false,
          signature_data_url: newBooking.signatureDataUrl || null,
        },
      ]),
    )
      .then(({ error }) => {
        if (error) {
          console.warn(
            "Could not save training booking to Supabase (saved locally):",
            error.message,
          );
        }
      })
      .catch((err: any) => {
        console.warn("Supabase training insert failed, saved locally:", err);
      });

    return newBooking;
  },

  // UPDATE TRAINING BOOKING
  async updateTrainingBooking(
    id: string,
    updates: Partial<TrainingBooking>,
  ): Promise<TrainingBooking> {
    if (typeof window !== "undefined") {
      const current = localStorage.getItem(TRAINING_BOOKINGS_LOCAL_KEY);
      if (current) {
        try {
          const list = JSON.parse(current) as TrainingBooking[];
          const index = list.findIndex((b) => b.id === id);
          if (index !== -1) {
            list[index] = { ...list[index], ...updates };
            localStorage.setItem(TRAINING_BOOKINGS_LOCAL_KEY, JSON.stringify(list));
          }
        } catch {}
      }
    }

    const dbPayload: any = {};
    if (updates.ownerName !== undefined) dbPayload.owner_name = updates.ownerName;
    if (updates.petName !== undefined) dbPayload.pet_name = updates.petName;
    if (updates.breed !== undefined) dbPayload.breed = updates.breed;
    if (updates.age !== undefined) dbPayload.age = updates.age;
    if (updates.trainingType !== undefined) dbPayload.training_type = updates.trainingType;
    if (updates.preferredDate !== undefined) dbPayload.preferred_date = updates.preferredDate;
    if (updates.selectedCommands !== undefined)
      dbPayload.selected_commands = updates.selectedCommands;
    if (updates.medicalConditions !== undefined)
      dbPayload.medical_conditions = updates.medicalConditions;
    if (updates.completed !== undefined) dbPayload.completed = updates.completed;
    if (updates.liabilityAccepted !== undefined)
      dbPayload.liability_accepted = updates.liabilityAccepted;
    if (updates.consentGiven !== undefined) dbPayload.consent_given = updates.consentGiven;
    if (updates.signatureDataUrl !== undefined)
      dbPayload.signature_data_url = updates.signatureDataUrl;

    const { error } = await (supabase as any)
      .from("training_bookings")
      .update(dbPayload)
      .eq("id", id);

    if (error) {
      console.warn("Could not update training booking in Supabase:", error.message);
    }

    const updatedList = await this.getTrainingBookings();
    const updated = updatedList.find((b) => b.id === id);
    if (!updated) throw new Error("Booking not found after update");
    return updated;
  },

  // DELETE TRAINING BOOKING (admin action)
  async deleteTrainingBooking(id: string): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const bookings = await this.getTrainingBookings();
    const filtered = bookings.filter((b) => b.id !== id);
    localStorage.setItem(TRAINING_BOOKINGS_LOCAL_KEY, JSON.stringify(filtered));

    const { error } = await (supabase as any).from("training_bookings").delete().eq("id", id);

    if (error) {
      console.warn("Could not delete training booking from Supabase:", error.message);
    }
    return true;
  },

  // ─── HOSTELLING BOOKINGS ───────────────────────────────────────────

  // GET ALL HOSTELLING BOOKINGS
  async getHostellingBookings(): Promise<HostellingBooking[]> {
    if (typeof window === "undefined") return [];
    const localVal = localStorage.getItem(HOSTELLING_BOOKINGS_LOCAL_KEY);
    let fallback: HostellingBooking[] = [];
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
          .from("hostelling_bookings")
          .select("*")
          .order("created_at", { ascending: false }),
      );

      if (error) {
        console.warn(
          "Supabase hostelling_bookings fetch failed, using local fallback:",
          error.message,
        );
        return fallback;
      }

      const remoteBookings: HostellingBooking[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        parentName: row.parent_name,
        parentEmail: row.parent_email,
        parentPhone: row.parent_phone,
        petName: row.pet_name,
        petBreed: row.pet_breed,
        petGender: row.pet_gender as "Male" | "Female",
        petAge: row.pet_age,
        medicalConditions: row.medical_conditions || "",
        medicalImage: row.medical_image || "",
        temperament: row.temperament as "Friendly" | "Aggressive",
        aggressionDetails: row.aggression_details,
        urineTrained: !!row.urine_trained,
        pottyTrained: !!row.potty_trained,
        checkInDate: row.check_in_date,
        checkOutDate: row.check_out_date,
        numDays: Number(row.num_days),
        signatureDataUrl: row.signature_data_url,
        completed: !!row.completed,
        createdAt: row.created_at,
        submittedAt: new Date(row.created_at).toLocaleString(),
      }));

      localStorage.setItem(HOSTELLING_BOOKINGS_LOCAL_KEY, JSON.stringify(remoteBookings));
      return remoteBookings;
    } catch (err) {
      console.warn("Error in getHostellingBookings, returning local fallback:", err);
      return fallback;
    }
  },

  // CREATE HOSTELLING BOOKING
  async createHostellingBooking(
    input: Omit<HostellingBooking, "id" | "createdAt" | "completed" | "submittedAt">,
  ): Promise<HostellingBooking> {
    const newId = safeUUID();
    const newBooking: HostellingBooking = {
      ...input,
      id: newId,
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toLocaleString(),
      completed: false,
    };

    if (typeof window !== "undefined") {
      const current = localStorage.getItem(HOSTELLING_BOOKINGS_LOCAL_KEY);
      let list: HostellingBooking[] = [];
      if (current) {
        try {
          list = JSON.parse(current);
        } catch {
          list = [];
        }
      }
      list.unshift(newBooking);
      localStorage.setItem(HOSTELLING_BOOKINGS_LOCAL_KEY, JSON.stringify(list));
    }

    Promise.resolve(
      (supabase as any).from("hostelling_bookings").insert([
        {
          id: newBooking.id,
          user_id: newBooking.user_id || null,
          parent_name: newBooking.parentName,
          parent_email: newBooking.parentEmail,
          parent_phone: newBooking.parentPhone,
          pet_name: newBooking.petName,
          pet_breed: newBooking.petBreed,
          pet_gender: newBooking.petGender,
          pet_age: newBooking.petAge,
          medical_conditions: newBooking.medicalConditions,
          medical_image: newBooking.medicalImage,
          temperament: newBooking.temperament,
          aggression_details: newBooking.aggressionDetails,
          urine_trained: newBooking.urineTrained,
          potty_trained: newBooking.pottyTrained,
          check_in_date: newBooking.checkInDate,
          check_out_date: newBooking.checkOutDate,
          num_days: newBooking.numDays,
          signature_data_url: newBooking.signatureDataUrl,
          completed: false,
        },
      ]),
    )
      .then(({ error }) => {
        if (error) {
          console.warn(
            "Could not save hostelling booking to Supabase (saved locally):",
            error.message,
          );
        }
      })
      .catch((err: any) => {
        console.warn("Supabase hostelling insert failed, saved locally:", err);
      });

    return newBooking;
  },

  // UPDATE HOSTELLING BOOKING
  async updateHostellingBooking(
    id: string,
    updates: Partial<HostellingBooking>,
  ): Promise<HostellingBooking> {
    if (typeof window !== "undefined") {
      const current = localStorage.getItem(HOSTELLING_BOOKINGS_LOCAL_KEY);
      if (current) {
        try {
          const list = JSON.parse(current) as HostellingBooking[];
          const index = list.findIndex((b) => b.id === id);
          if (index !== -1) {
            list[index] = { ...list[index], ...updates };
            localStorage.setItem(HOSTELLING_BOOKINGS_LOCAL_KEY, JSON.stringify(list));
          }
        } catch {}
      }
    }

    const dbPayload: any = {};
    if (updates.parentName !== undefined) dbPayload.parent_name = updates.parentName;
    if (updates.parentEmail !== undefined) dbPayload.parent_email = updates.parentEmail;
    if (updates.parentPhone !== undefined) dbPayload.parent_phone = updates.parentPhone;
    if (updates.petName !== undefined) dbPayload.pet_name = updates.petName;
    if (updates.petBreed !== undefined) dbPayload.pet_breed = updates.petBreed;
    if (updates.petGender !== undefined) dbPayload.pet_gender = updates.petGender;
    if (updates.petAge !== undefined) dbPayload.pet_age = updates.petAge;
    if (updates.medicalConditions !== undefined)
      dbPayload.medical_conditions = updates.medicalConditions;
    if (updates.medicalImage !== undefined) dbPayload.medical_image = updates.medicalImage;
    if (updates.temperament !== undefined) dbPayload.temperament = updates.temperament;
    if (updates.aggressionDetails !== undefined)
      dbPayload.aggression_details = updates.aggressionDetails;
    if (updates.urineTrained !== undefined) dbPayload.urine_trained = updates.urineTrained;
    if (updates.pottyTrained !== undefined) dbPayload.potty_trained = updates.pottyTrained;
    if (updates.checkInDate !== undefined) dbPayload.check_in_date = updates.checkInDate;
    if (updates.checkOutDate !== undefined) dbPayload.check_out_date = updates.checkOutDate;
    if (updates.numDays !== undefined) dbPayload.num_days = updates.numDays;
    if (updates.signatureDataUrl !== undefined)
      dbPayload.signature_data_url = updates.signatureDataUrl;
    if (updates.completed !== undefined) dbPayload.completed = updates.completed;

    const { error } = await (supabase as any)
      .from("hostelling_bookings")
      .update(dbPayload)
      .eq("id", id);

    if (error) {
      console.warn("Could not update hostelling booking in Supabase:", error.message);
    }

    const updatedList = await this.getHostellingBookings();
    const updated = updatedList.find((b) => b.id === id);
    if (!updated) throw new Error("Booking not found after update");
    return updated;
  },

  // DELETE HOSTELLING BOOKING
  async deleteHostellingBooking(id: string): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const bookings = await this.getHostellingBookings();
    const filtered = bookings.filter((b) => b.id !== id);
    localStorage.setItem(HOSTELLING_BOOKINGS_LOCAL_KEY, JSON.stringify(filtered));

    const { error } = await (supabase as any).from("hostelling_bookings").delete().eq("id", id);

    if (error) {
      console.warn("Could not delete hostelling booking from Supabase:", error.message);
    }
    return true;
  },

  // ───────────────────── CONTACT SUBMISSIONS ─────────────────────

  async getContactSubmissions(): Promise<ContactSubmission[]> {
    if (typeof window === "undefined") return [];

    // Local fallback
    let local: ContactSubmission[] = [];
    try {
      const stored = localStorage.getItem("pawhaven_contact_submissions");
      if (stored) local = JSON.parse(stored);
    } catch {}

    const isMock = !!localStorage.getItem("pawhaven_mock_session");
    if (isMock) return local;

    try {
      const { data, error } = await (supabase as any)
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const remote: ContactSubmission[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        subject: row.subject,
        message: row.message,
        created_at: row.created_at,
        read: row.read ?? false,
      }));

      // Merge remote + local (deduplicate by id)
      const ids = new Set(remote.map((r) => r.id));
      const merged = [...remote, ...local.filter((l) => !ids.has(l.id))];
      return merged;
    } catch (err) {
      console.warn("Error fetching contact submissions, returning local:", err);
      return local;
    }
  },

  async deleteContactSubmission(id: string): Promise<boolean> {
    if (typeof window === "undefined") return false;

    // Remove from localStorage
    try {
      const stored = localStorage.getItem("pawhaven_contact_submissions") || "[]";
      let list: ContactSubmission[] = JSON.parse(stored);
      list = list.filter((s) => s.id !== id);
      localStorage.setItem("pawhaven_contact_submissions", JSON.stringify(list));
    } catch {}

    // Remove from Supabase
    const { error } = await (supabase as any).from("contact_submissions").delete().eq("id", id);

    if (error) {
      console.warn("Could not delete contact submission from Supabase:", error.message);
    }
    return true;
  },

  async markContactSubmissionRead(id: string, read: boolean): Promise<void> {
    // Update local
    try {
      const stored = localStorage.getItem("pawhaven_contact_submissions") || "[]";
      let list: ContactSubmission[] = JSON.parse(stored);
      const idx = list.findIndex((s) => s.id === id);
      if (idx !== -1) {
        list[idx].read = read;
        localStorage.setItem("pawhaven_contact_submissions", JSON.stringify(list));
      }
    } catch {}

    // Update Supabase
    await (supabase as any).from("contact_submissions").update({ read }).eq("id", id);
  },
};

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  read?: boolean;
}
