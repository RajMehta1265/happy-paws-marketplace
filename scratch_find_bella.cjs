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

async function find() {
  console.log("Searching for 'Bella' in 'pets' table...");
  const { data: standardPets, error: standardError } = await supabase
    .from("pets")
    .select("*")
    .eq("name", "Bella");

  if (standardError) {
    console.error("Error standard:", standardError);
  } else {
    console.log("Found in pets:", standardPets);
  }

  console.log("\nSearching for 'Bella' in 'exotic_pets' table...");
  const { data: exoticPets, error: exoticError } = await supabase
    .from("exotic_pets")
    .select("*")
    .eq("name", "Bella");

  if (exoticError) {
    console.error("Error exotic:", exoticError);
  } else {
    console.log("Found in exotic_pets:", exoticPets);
  }
}

find();
