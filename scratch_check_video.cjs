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

async function inspect() {
  console.log("Checking standard pets in Supabase...");
  const { data: pets, error } = await supabase
    .from("pets")
    .select("id, name, type, breed, image_url, video_url");

  if (error) {
    console.error("Error standard pets query:", error);
  } else {
    console.log("Found standard pets count:", pets.length);
    pets.forEach((p) => {
      console.log(`- ${p.name} (ID: ${p.id}):`);
      console.log(
        `  image_url: ${(p.image_url || "").substring(0, 100)}${p.image_url && p.image_url.length > 100 ? "..." : ""}`,
      );
      console.log(
        `  video_url: ${(p.video_url || "").substring(0, 100)}${p.video_url && p.video_url.length > 100 ? "..." : ""}`,
      );
    });
  }
}

inspect();
