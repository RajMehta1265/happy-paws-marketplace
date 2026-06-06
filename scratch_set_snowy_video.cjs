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

async function update() {
  console.log("Updating Snowy's video_url in Supabase...");
  const presetVideo =
    "https://assets.mixkit.co/videos/preview/mixkit-golden-retriever-puppy-sitting-on-grass-32860-large.mp4";

  const { data, error } = await supabase
    .from("pets")
    .update({ video_url: presetVideo })
    .eq("name", "Snowy");

  if (error) {
    console.error("Error updating Snowy:", error);
  } else {
    console.log("Success! Snowy's video_url has been set to the preset video.");
  }
}

update();
