# 🐺 WOOLF.INDIA — Premium Companions, Adoption & Care

Welcome to **WOOLF.INDIA**, India's premier pet marketplace and luxury companion ecosystem. This platform connects users with verified, healthy, and high-quality companion animals, offering elite training programs, professional hostelling, and premium pet products.

Live Production URL: **[https://woolfindia.com](https://woolfindia.com)**
Hosted on: **Vercel** (via Nitro Server Engine)

---

## 🌟 Key Features Implemented

### 1. Cinematic Luxury Intro & Scrollytelling
- **Autoplay Cinematic Video**: Renders a stunning fullscreen video header ("Woolf Howling") upon page load with cinematic vignette styling.
- **Strict Scroll Lock**: Manual scroll interactions are fully locked while the video plays, ensuring clean presentation with zero prompts or overlays on the video container.
- **Auto-Shutter Transition**: When the video completes, the page automatically scrolls down, revealing a split-door shutter ("WOOLF | INDIA") that splits horizontally (using GSAP).
- **Centered Scroll Indicator & Bottom Skip**: Once the shutter opens, it reveals the main brand statement with a bouncing mouse scroll-down cue in the absolute center (clickable to scroll to the next scene) and a glassmorphic "Skip Intro" button at the bottom center (to skip straight to homepage content).
- **Responsive Scrollytelling**: Custom GSAP ScrollTrigger timeline handles all scene fades, logo splits, and text reveals, optimized for mobile, tablet, and desktop screens.

### 2. Comprehensive Pet & Exotic Catalogues
- Dual marketplaces for standard pets (Dogs, Cats, etc.) and Exotic companions.
- **Search & Advanced Filtering**: Filter companions by type, breed, age, gender, and price range.
- **Smooth Pagination**: Robust custom pagination with bounds protection and automatic smooth scroll reset back to the listing section (with navbar offset).
- **Rich Media & Storage**: Supports multi-image galleries on pet details. To prevent `QuotaExceededError` in browser local storage, large media blobs are cached using **IndexedDB**.

### 3. Unified Booking Systems
- **Hostelling**: Visual date-range calendar booking system with distinct billing logic for dogs and cats.
- **Elite Training**: Details modular training programs (Basic, Advance, etc.) with a step-down pricing structure and interactive price calculators.
- **Liability & Signature Consent**: Fully integrated signature canvas for digital consent forms when submitting bookings.

### 4. Admin Management Dashboard
- **Overview Stat Cards**: Detailed metrics for bookings, users, products, and adoptions with interactive detail modals.
- **Dynamic Category Control**: Administrators can add/manage product categories on the fly, rendering dynamically across the catalogs.
- **System Maintenance Utilities**: Unified admin control panel supporting data resets and test data cleaning.
- **Case-Insensitive Roles**: Admin promotions and authentications are robustly protected and synchronized.

### 5. Seamless Payments & Communication
- **Razorpay Integration**: End-to-end checkout integration supporting standard checkouts, unified order generation, and secure server endpoints.
- **Brevo SMTP (Emailing)**: Automatic booking summaries and user notifications sent via transactional emails.

---

## 🛠️ Technology Stack & Architecture

- **Frontend Core**: React 18, TypeScript, Tailwind CSS
- **Routing & SSR**: [TanStack Start](https://tanstack.com/router/v1/docs/start/overview) + [TanStack Router](https://tanstack.com/router/v1) (Server-Side Rendering & File-Based Routing)
- **State Management**: [TanStack Query](https://tanstack.com/query/v1) (React Query)
- **Animations**: [GSAP](https://gsap.com/) (GreenSock Animation Platform with ScrollTrigger) + [Lenis](https://lenis.darkroom.engineering/) (Smooth Inertia Scrolling)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL database, real-time sync, and backup authentication session caching)
- **Hosting Engine**: [Nitro](https://nitro.unjs.io/) (used as the server build bundle framework with the `vercel` preset)
- **Signature Forms**: HTML5 Canvas API
- **Media Cache**: IndexedDB API

---

## 🚀 Deployment & Hosting

### Infrastructure
- **Hosting Provider**: [Vercel](https://vercel.com)
- **Framework Preset**: Nitro (`framework: "nitro"` inside `vercel.json` and `preset: "vercel"` in `vite.config.ts`)
- **Supabase Backend**: Configured via connection strings and publishable keys stored securely in Vercel Environment Variables.
- **Transactional Mail & Payment**: Razorpay API credentials and Brevo SMTP credentials configured globally.

### Build & Run Locally
Make sure you have Node.js / Bun installed.

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file at the root with your API keys (Supabase, Razorpay, Brevo):
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-key"
   ...
   ```

3. **Start local development server**:
   ```bash
   npm run dev
   ```

4. **Build for production (generates Vercel-compatible outputs)**:
   ```bash
   npm run build
   ```
