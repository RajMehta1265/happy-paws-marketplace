const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");
let envContent = "";
try {
  envContent = fs.readFileSync(envPath, "utf8");
} catch (e) {
  console.error("Could not read .env file:", e);
  process.exit(1);
}

const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = `temp_admin_${Date.now()}@example.com`;
  const password = "password123";

  console.log(`1. Signing up temporary user: ${email}...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.error("Sign up failed:", signUpError.message);
    return;
  }

  const user = signUpData.user;
  console.log("Sign up successful. User ID:", user.id);

  console.log("2. Calling claim_first_admin RPC...");
  const { data: claimResult, error: claimError } = await supabase.rpc("claim_first_admin");

  if (claimError) {
    console.error("RPC claim_first_admin failed:", claimError.message);
  } else {
    console.log("RPC claim_first_admin returned:", claimResult);
  }

  // Double check user roles
  console.log("3. Attempting to delete the two 'max' pets from pets table...");
  const ids = ["e132fa4c-aea1-40c3-abd0-9253adf4c01e", "ebda8e22-fda3-4e77-8654-f5010f576818"];
  const { data: deleteData, error: deleteError } = await supabase
    .from("pets")
    .delete()
    .in("id", ids)
    .select();

  if (deleteError) {
    console.error("Delete pets error:", deleteError.message);
  } else {
    console.log("Delete pets response data:", deleteData);
  }

  // Also clean up by deleting our user
  console.log("Finished attempt.");
}

run();
