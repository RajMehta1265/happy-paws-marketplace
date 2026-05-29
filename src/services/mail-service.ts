import { createServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

// Define the server function that sends the email using the Brevo API
export const sendEmailServer = createServerFn({ method: "POST" })
  .inputValidator((d: { to: string; subject: string; html: string }) => d)
  .handler(async ({ data }) => {
    // 1. Try standard process.env and import.meta.env
    let apiKey = process.env.VITE_BREVO_API_KEY || import.meta.env.VITE_BREVO_API_KEY;
    let senderEmail =
      process.env.VITE_BREVO_SENDER_EMAIL || import.meta.env.VITE_BREVO_SENDER_EMAIL;
    let senderName =
      process.env.VITE_BREVO_SENDER_NAME || import.meta.env.VITE_BREVO_SENDER_NAME || "WOOLF.INDIA";

    // 2. Direct fallback reading of the .env file (runs ONLY on the server side)
    if (!apiKey || !senderEmail) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const envPath = path.resolve(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, "utf-8");
          const apiKeyMatch = envContent.match(/^VITE_BREVO_API_KEY=["']?([^"'\r\n]+)["']?/m);
          const senderEmailMatch = envContent.match(
            /^VITE_BREVO_SENDER_EMAIL=["']?([^"'\r\n]+)["']?/m,
          );
          const senderNameMatch = envContent.match(
            /^VITE_BREVO_SENDER_NAME=["']?([^"'\r\n]+)["']?/m,
          );

          if (apiKeyMatch && apiKeyMatch[1]) {
            apiKey = apiKeyMatch[1].trim();
            console.log(
              "[Mail Service] Server Fn: Read VITE_BREVO_API_KEY directly from .env file",
            );
          }
          if (senderEmailMatch && senderEmailMatch[1]) {
            senderEmail = senderEmailMatch[1].trim();
            console.log(
              "[Mail Service] Server Fn: Read VITE_BREVO_SENDER_EMAIL directly from .env file",
            );
          }
          if (senderNameMatch && senderNameMatch[1]) {
            senderName = senderNameMatch[1].trim();
          }
        }
      } catch (err) {
        console.error("[Mail Service] Server Fn: Error reading .env file manually:", err);
      }
    }

    if (!apiKey) {
      throw new Error("VITE_BREVO_API_KEY is not configured on the server.");
    }
    if (!senderEmail) {
      throw new Error("VITE_BREVO_SENDER_EMAIL is not configured on the server.");
    }

    // Call Brevo SMTP Send Transactional Email API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: data.to,
            name: data.to,
          },
        ],
        subject: data.subject,
        htmlContent: data.html,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Brevo API returned status ${response.status}`);
    }

    const resData = await response.json();
    return { success: true, resData };
  });

/**
 * Service to send emails using the Brevo API (executes on the server to prevent CORS and exposure of credentials)
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const response = await sendEmailServer({ data: { to, subject, html } });
    if (response?.success) {
      console.log(`[Mail Service] Email sent successfully via Brevo to ${to}`);
      toast.success(`Email sent successfully to ${to}!`);
      return true;
    }
    return false;
  } catch (err) {
    console.error("[Mail Service] Failed to send email via Brevo:", err);
    toast.error(`Failed to send email: ${(err as Error).message}`);
    return false;
  }
}
