import pet1 from "@/assets/pet-1.jpg";
import pet2 from "@/assets/pet-2.jpg";
import pet3 from "@/assets/pet-3.jpg";
import pet4 from "@/assets/pet-4.jpg";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";

export type Pet = {
  id: string;
  name: string;
  type: "Dog" | "Cat" | "Rabbit" | "Bird" | "Hamster";
  breed: string;
  age: string;
  price: number;
  image: string;
  vaccinated: boolean;
  adoption?: boolean;
  description: string;
};

export const pets: Pet[] = [
  {
    id: "milo",
    name: "Milo",
    type: "Dog",
    breed: "Beagle",
    age: "3 months",
    price: 650,
    image: pet1,
    vaccinated: true,
    description: "A curious and gentle beagle pup, fully vaccinated and ready for cuddles.",
  },
  {
    id: "luna",
    name: "Luna",
    type: "Cat",
    breed: "Persian",
    age: "5 months",
    price: 480,
    image: pet2,
    vaccinated: true,
    description: "Soft, dreamy persian kitten with bright eyes and a sweet temperament.",
  },
  {
    id: "biscuit",
    name: "Biscuit",
    type: "Rabbit",
    breed: "Holland Lop",
    age: "4 months",
    price: 180,
    image: pet3,
    vaccinated: true,
    adoption: true,
    description: "Looking for a forever home — calm, litter-trained, loves leafy greens.",
  },
  {
    id: "kiwi",
    name: "Kiwi",
    type: "Bird",
    breed: "Budgerigar",
    age: "6 months",
    price: 90,
    image: pet4,
    vaccinated: false,
    description: "Cheerful little budgie who already mimics a few whistles.",
  },
  {
    id: "rosie",
    name: "Rosie",
    type: "Dog",
    breed: "Beagle",
    age: "2 months",
    price: 720,
    image: pet1,
    vaccinated: true,
    adoption: true,
    description: "Rescue puppy ready for a loving family.",
  },
  {
    id: "mochi",
    name: "Mochi",
    type: "Cat",
    breed: "Persian",
    age: "3 months",
    price: 520,
    image: pet2,
    vaccinated: true,
    description: "Plush coat, gentle nature, ideal lap companion.",
  },
];

export type Product = {
  id: string;
  name: string;
  category: "Food" | "Toys" | "Grooming" | "Accessories";
  price: number;
  image: string;
  rating: number;
};

export const products: Product[] = [
  {
    id: "p1",
    name: "Heritage Grain-Free Kibble",
    category: "Food",
    price: 42,
    image: product1,
    rating: 4.8,
  },
  {
    id: "p2",
    name: "Cloud Wool Pet Bed",
    category: "Accessories",
    price: 89,
    image: product2,
    rating: 4.9,
  },
  {
    id: "p3",
    name: "Hand-knotted Rope Toy",
    category: "Toys",
    price: 18,
    image: product3,
    rating: 4.7,
  },
  {
    id: "p4",
    name: "Botanical Grooming Set",
    category: "Grooming",
    price: 56,
    image: product1,
    rating: 4.6,
  },
  {
    id: "p5",
    name: "Linen Travel Carrier",
    category: "Accessories",
    price: 124,
    image: product2,
    rating: 4.8,
  },
  {
    id: "p6",
    name: "Forest Chew Bundle",
    category: "Toys",
    price: 28,
    image: product3,
    rating: 4.5,
  },
];

export type TrainingPlan = {
  id: string;
  title: string;
  mode: "Online" | "In-person";
  duration: string;
  price: number;
  perks: string[];
};

export const trainingPlans: TrainingPlan[] = [
  {
    id: "starter",
    title: "Puppy Foundations",
    mode: "In-person",
    duration: "4 weeks",
    price: 220,
    perks: ["Sit, stay, recall", "Leash manners", "Socialization"],
  },
  {
    id: "online",
    title: "At-Home Essentials",
    mode: "Online",
    duration: "6 weeks",
    price: 140,
    perks: ["Live sessions", "Trainer chat", "Custom plan"],
  },
  {
    id: "advanced",
    title: "Advanced Obedience",
    mode: "In-person",
    duration: "8 weeks",
    price: 420,
    perks: ["Off-leash skills", "Behavior shaping", "Trick fluency"],
  },
];

export const trainers = [
  { name: "Amelia Hart", specialty: "Puppy & socialization", years: 9 },
  { name: "Daniel Okafor", specialty: "Behavior correction", years: 12 },
  { name: "Sara Bellini", specialty: "Online coaching", years: 6 },
];

export const testimonials = [
  {
    name: "Hannah & Milo",
    quote: "PawHaven made adopting feel like joining a family. Milo is everything.",
  },
  {
    name: "Owen R.",
    quote: "The training program transformed our anxious rescue into a confident companion.",
  },
  {
    name: "Priya S.",
    quote: "Beautiful products, thoughtful service. My cat has never been so spoiled.",
  },
];

export const blogs = [
  {
    id: "nutrition-101",
    title: "Nutrition 101: Feeding Your Puppy Right",
    excerpt: "A balanced bowl is the foundation of a long, joyful life.",
    date: "May 12, 2026",
    read: "5 min",
  },
  {
    id: "first-week",
    title: "The First Week Home: A Gentle Guide",
    excerpt: "Set the tone for a lifelong bond with these calm rituals.",
    date: "Apr 28, 2026",
    read: "7 min",
  },
  {
    id: "grooming-rituals",
    title: "Grooming Rituals for Sensitive Pets",
    excerpt: "Slow, scent-led grooming that turns chores into care.",
    date: "Apr 02, 2026",
    read: "4 min",
  },
];
