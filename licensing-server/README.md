# AutoStitch Studio — Standalone Licensing Server Backend

This repository houses the standalone, production-ready licensing server and web administration key generator dashboard for **AutoStitch Studio**. 

Designed for 100% serverless hosting on Vercel, it uses serverless Node.js endpoints and a Supabase PostgreSQL database to handle secure key generation, monthly activation, device-locking (motherboard UUID validation), and expiration verification.

## Features
* 🔑 **"AutoStitch Studio" Key Generator Portal**: A premium, secure visual dashboard for administrators to generate new monthly licenses, track customer emails, and review active hardware fingerprints.
* 🔒 **Cryptographic Device Locking**: Pairs each license key uniquely with the user's motherboard UUID to prevent key-sharing and abuse.
* ⚡ **Serverless Endpoints**: Fully optimized for Vercel functions:
  * `/api/generate-key` — Admin monthly key creation.
  * `/api/activate` — Device pairing & initial activation.
  * `/api/verify` — Decoupled real-time license verification.
* 💾 **Supabase Database Binding**: Database schema with complete indexes to log activations, devices, and metadata.

---

## Direct Deployment to Vercel

To host this licensing system in 3 minutes with zero-configuration:

1. Import this **`auto_Stitch_backend`** repository into Vercel.
2. In your Vercel project settings, configure the following **Environment Variables**:
   * `SUPABASE_URL` — Your Supabase project URL.
   * `SUPABASE_SERVICE_ROLE_KEY` — Your Supabase master service role key.
   * `MASTER_KEY` — A secure key to authenticate your administrator dashboard (used to generate license keys).
3. Deploy! Vercel will automatically host the static administration panel at the root domain and build the serverless functions under `/api/*` perfectly.

---

## Database Setup

Run the SQL statements in [schema.sql](schema.sql) in your **Supabase SQL Editor** to initialize the `licenses` table, constraints, and optimization indexes.

---

## Connecting the Desktop Client

Once deployed, copy your Vercel deployment URL (e.g. `https://auto-stitch-backend.vercel.app`) and configure it under **Settings** $\rightarrow$ **License Server URL** inside the AutoStitch Studio desktop application!
