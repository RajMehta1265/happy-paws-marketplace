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
  const id = "3cb6cec9-9e3c-4ef9-b45a-8e14433730d3";
  console.log(`Checking standard pets table for ID: ${id}...`);
  const { data: standardData, error: standardError } = await supabase
    .from("pets")
    .select("*")
    .eq("id", id);

  if (standardError) {
    console.error("Standard query error:", standardError);
  } else {
    console.log("Found in standard pets:", standardData);
  }

  console.log(`\nChecking exotic_pets table for ID: ${id}...`);
  const { data: exoticData, error: exoticError } = await supabase
    .from("exotic_pets")
    .select("*")
    .eq("id", id);

  if (exoticError) {
    console.error("Exotic query error:", exoticError);
  } else {
    console.log("Found in exotic pets:", exoticData);
  }
}

check();
