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

async function deleteBella() {
  console.log("Deleting 'Bella' from 'pets' table...");
  const { data: standardPets, error: standardError } = await supabase
    .from("pets")
    .delete()
    .eq("name", "Bella");

  if (standardError) {
    console.error("Error deleting from pets:", standardError);
  } else {
    console.log("Deleted from pets:", standardPets);
  }

  console.log("Deleting 'Bella' from 'exotic_pets' table...");
  const { data: exoticPets, error: exoticError } = await supabase
    .from("exotic_pets")
    .delete()
    .eq("name", "Bella");

  if (exoticError) {
    console.error("Error deleting from exotic_pets:", exoticError);
  } else {
    console.log("Deleted from exotic_pets:", exoticPets);
  }
}

deleteBella();
