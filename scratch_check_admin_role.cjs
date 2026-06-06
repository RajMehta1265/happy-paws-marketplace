const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Read .env file manually
const envPath = path.join(process.cwd(), ".env");
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
  console.log("Checking profiles table...");
  const { data: profiles, error: err1 } = await supabase.from("profiles").select("*");
  if (err1) {
    console.error("Profiles error:", err1);
  } else {
    console.log("Profiles in DB:", profiles);
  }

  console.log("\nChecking user_roles table...");
  const { data: roles, error: err2 } = await supabase.from("user_roles").select("*");
  if (err2) {
    console.error("Roles error:", err2);
  } else {
    console.log("User roles in DB:", roles);
  }
}

check();
