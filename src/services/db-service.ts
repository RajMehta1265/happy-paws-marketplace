import { supabase } from "@/integrations/supabase/client";
import pet1 from "@/assets/pet-1.jpg";
import pet2 from "@/assets/pet-2.jpg";
import pet3 from "@/assets/pet-3.jpg";
import pet4 from "@/assets/pet-4.jpg";
import scarletMacaw from "@/assets/scarlet-macaw.png";
import sugarGlider from "@/assets/sugar-glider.png";
import chameleon from "@/assets/chameleon.png";

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
      return JSON.parse(data);
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
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase fetch failed, using local fallback:", error.message);
        return localPets;
      }

      if (!data || data.length === 0) {
        // If Supabase is empty, seed it with local data
        console.log("Supabase table is empty. Seeding Supabase with local data...");
        for (const pet of localPets) {
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
        return localPets;
      }

      // Merge Supabase data with local videos (since Supabase might not store video_url)
      const merged = data.map((sp: any) => {
        const lp = localPets.find((l) => l.name.toLowerCase() === sp.name.toLowerCase());
        return {
          id: sp.id,
          name: sp.name,
          type: sp.type,
          breed: sp.breed || "",
          age: sp.age || "",
          price: Number(sp.price),
          image_url: sp.image_url || pet1,
          video_url: sp.video_url || lp?.video_url || null, // Preserve video_url if saved locally
          vaccinated: !!sp.vaccinated,
          adoption: !!sp.adoption,
          status: sp.status || "available",
          description: sp.description || "",
          created_at: sp.created_at,
        };
      });

      return merged;
    } catch (err) {
      console.warn("Error in getPets, returning local storage:", err);
      return localPets;
    }
  },

  // GET SINGLE PET BY ID
  async getPet(id: string): Promise<Pet | null> {
    const localPets = this.initLocalData();
    try {
      const { data, error } = await supabase.from("pets").select("*").eq("id", id).maybeSingle();

      if (error || !data) {
        // Fallback to local storage
        return localPets.find((p) => p.id === id) || null;
      }

      const lp = localPets.find(
        (l) => l.name.toLowerCase() === data.name.toLowerCase() || l.id === data.id,
      );
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        breed: data.breed || "",
        age: data.age || "",
        price: Number(data.price),
        image_url: data.image_url || pet1,
        video_url: (data as any).video_url || lp?.video_url || null,
        vaccinated: !!data.vaccinated,
        adoption: !!data.adoption,
        status: data.status || "available",
        description: data.description || "",
        created_at: data.created_at,
      };
    } catch (err) {
      console.warn(`Error in getPet(${id}), returning local storage pet:`, err);
      return localPets.find((p) => p.id === id) || null;
    }
  },

  // CREATE PET
  async createPet(petInput: Omit<Pet, "id">): Promise<Pet> {
    const localPets = this.initLocalData();
    const newId = crypto.randomUUID();
    const newPet: Pet = {
      ...petInput,
      id: newId,
      created_at: new Date().toISOString(),
    };

    // Save to local storage
    const updatedPets = [newPet, ...localPets];
    this.saveLocalData(updatedPets);

    // Save to Supabase (attempt)
    try {
      // Attempt insert with video_url. If column is missing, retry without it
      const { error } = await supabase.from("pets").insert([
        {
          name: newPet.name,
          type: newPet.type,
          breed: newPet.breed,
          age: newPet.age,
          price: newPet.price,
          image_url: newPet.image_url,
          video_url: newPet.video_url,
          description: newPet.description,
          vaccinated: newPet.vaccinated,
          adoption: newPet.adoption,
          status: newPet.status,
        },
      ] as any);
      if (error) {
        if (error.message.includes("column") || error.message.includes("video_url")) {
          console.warn(
            "video_url column is missing in Supabase pets table. Retrying insert without it...",
          );
          const { video_url, ...supabasePayload } = newPet;
          const { error: retryError } = await supabase.from("pets").insert([supabasePayload]);
          if (retryError) console.warn("Retry failed:", retryError.message);
        } else {
          console.warn("Could not save pet to Supabase (saved locally instead):", error.message);
        }
      }
    } catch (err) {
      console.warn("Supabase insert failed, pet saved to local storage only:", err);
    }

    return newPet;
  },

  // UPDATE PET
  async updatePet(id: string, petInput: Partial<Pet>): Promise<Pet> {
    const localPets = this.initLocalData();
    const index = localPets.findIndex((p) => p.id === id);
    let updatedPet = localPets[index];

    if (index !== -1) {
      updatedPet = { ...localPets[index], ...petInput };
      localPets[index] = updatedPet;
      this.saveLocalData(localPets);
    }

    // Save to Supabase (attempt)
    try {
      const { error } = await supabase
        .from("pets")
        .update({
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
        } as any)
        .eq("id", id);

      if (error) {
        if (error.message.includes("column") || error.message.includes("video_url")) {
          console.warn(
            "video_url column is missing in Supabase pets table. Retrying update without it...",
          );
          const { video_url, id: _id, created_at: _c, ...supabasePayload } = petInput;
          const { error: retryError } = await supabase
            .from("pets")
            .update(supabasePayload)
            .eq("id", id);
          if (retryError) console.warn("Retry failed:", retryError.message);
        } else {
          console.warn(
            "Could not update pet in Supabase (updated locally instead):",
            error.message,
          );
        }
      }
    } catch (err) {
      console.warn("Supabase update failed, pet updated in local storage only:", err);
    }

    return updatedPet;
  },

  // DELETE PET
  async deletePet(id: string): Promise<boolean> {
    const localPets = this.initLocalData();
    const filtered = localPets.filter((p) => p.id !== id);
    this.saveLocalData(filtered);

    // Delete from Supabase (attempt)
    try {
      const { error } = await supabase.from("pets").delete().eq("id", id);
      if (error) {
        console.warn(
          "Could not delete pet from Supabase (deleted locally instead):",
          error.message,
        );
      }
    } catch (err) {
      console.warn("Supabase delete failed, pet deleted from local storage only:", err);
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
      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .order("created_at", { ascending: false });

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
      const { error } = await supabase.from("consultations").insert([
        {
          name: newConsultation.name,
          email: newConsultation.email,
          pet_type: newConsultation.pet_type,
          price_min: Number(newConsultation.price_min),
          price_max: Number(newConsultation.price_max),
        }
      ]);
      if (error) {
        console.warn("Could not save consultation to Supabase (saved locally instead):", error.message);
      }
    } catch (err) {
      console.warn("Supabase consultation insert failed, saved locally:", err);
    }

    return newConsultation;
  },
};
