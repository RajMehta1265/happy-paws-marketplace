const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabase = createClient(
  env.SUPABASE_URL || env.VITE_SUPABASE_URL,
  env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

async function check() {
  console.log("Listing all standard pets in Supabase...");
  const { data: standardPets, error: standardError } = await supabase
    .from("pets")
    .select("id, name, type, breed, price");

  if (standardError) {
    console.error("Standard query error:", standardError);
  } else {
    console.log("Standard pets count:", standardPets.length);
    console.log(standardPets);
  }

  console.log("\nListing all exotic pets in Supabase...");
  const { data: exoticPets, error: exoticError } = await supabase
    .from("exotic_pets")
    .select("id, name, type, breed, price");

  if (exoticError) {
    console.error("Exotic query error:", exoticError);
  } else {
    console.log("Exotic pets count:", exoticPets.length);
    console.log(exoticPets);
  }
}

check();
