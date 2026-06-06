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
  console.log("Checking columns of pets table...");
  const { data, error } = await supabase.rpc("get_table_columns", { table_name: "pets" });
  if (error) {
    // If no RPC, let's select a single row and print its keys
    console.log("RPC get_table_columns not found, selecting a row instead...");
    const { data: rows, error: selectError } = await supabase.from("pets").select("*").limit(1);
    if (selectError) {
      console.error("Select error:", selectError);
    } else if (rows && rows.length > 0) {
      console.log("Columns of pets table:", Object.keys(rows[0]));
    } else {
      console.log("No rows in pets table to inspect.");
    }
  } else {
    console.log("Columns from RPC:", data);
  }
}

check();
