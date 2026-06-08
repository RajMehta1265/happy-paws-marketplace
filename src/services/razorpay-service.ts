import { createServerFn } from "@tanstack/react-start";
import Razorpay from "razorpay";
import crypto from "crypto";

async function getRazorpayConfig() {
  let keyId = process.env.RAZORPAY_KEY_ID || import.meta.env.RAZORPAY_KEY_ID;
  let keySecret = process.env.RAZORPAY_KEY_SECRET || import.meta.env.RAZORPAY_KEY_SECRET;

  console.log("[Razorpay Config Debug] Initial keys from process.env:", { keyId, keySecret: keySecret ? "***" : undefined });

  if (!keyId || !keySecret) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const envPath = path.resolve(process.cwd(), ".env");
      console.log("[Razorpay Config Debug] Resolved .env path:", envPath);
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8");
        console.log("[Razorpay Config Debug] .env file content length:", envContent.length);
        const keyIdMatch = envContent.match(/^RAZORPAY_KEY_ID=["']?([^"'\r\n]+)["']?/m);
        const keySecretMatch = envContent.match(/^RAZORPAY_KEY_SECRET=["']?([^"'\r\n]+)["']?/m);
        
        console.log("[Razorpay Config Debug] Regex match results:", {
          keyIdMatch: keyIdMatch ? "Matched" : "No Match",
          keySecretMatch: keySecretMatch ? "Matched" : "No Match"
        });

        if (keyIdMatch && keyIdMatch[1]) {
          keyId = keyIdMatch[1].trim();
        }
        if (keySecretMatch && keySecretMatch[1]) {
          keySecret = keySecretMatch[1].trim();
        }
      } else {
        console.log("[Razorpay Config Debug] .env file does not exist at resolved path");
      }
    } catch (err) {
      console.error("[Razorpay Service] Error reading .env file manually:", err);
    }
  }

  console.log("[Razorpay Config Debug] Final keys resolved:", { keyId, keySecret: keySecret ? "***" : undefined });
  return { keyId, keySecret };
}

export const createRazorpayOrderServer = createServerFn({ method: "POST" })
  .inputValidator((d: { amount: number; currency?: string; receipt?: string }) => d)
  .handler(async ({ data }) => {
    const { keyId, keySecret } = await getRazorpayConfig();

    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials are not configured on the server.");
    }

    // Amount must be >= 100 paise
    if (data.amount < 100) {
      throw new Error("Minimum amount must be 100 paise (₹1).");
    }

    try {
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const options = {
        amount: Math.round(data.amount), // in paise
        currency: data.currency || "INR",
        receipt: data.receipt || `rcpt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      };
    } catch (err) {
      console.error("[Razorpay Service] Order creation failed:", err);
      throw new Error((err as Error).message || "Failed to create Razorpay order.");
    }
  });

export const verifyRazorpayPaymentServer = createServerFn({ method: "POST" })
  .inputValidator((d: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => d)
  .handler(async ({ data }) => {
    const { keySecret } = await getRazorpayConfig();

    if (!keySecret) {
      throw new Error("Razorpay credentials are not configured on the server.");
    }

    if (!data.razorpay_order_id || !data.razorpay_payment_id || !data.razorpay_signature) {
      throw new Error("Missing verification parameters.");
    }

    try {
      const generated_signature = crypto
        .createHmac("sha256", keySecret)
        .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
        .digest("hex");

      if (generated_signature === data.razorpay_signature) {
        return { success: true };
      } else {
        return { success: false, error: "Signature mismatch" };
      }
    } catch (err) {
      console.error("[Razorpay Service] Verification failed:", err);
      return { success: false, error: (err as Error).message };
    }
  });
