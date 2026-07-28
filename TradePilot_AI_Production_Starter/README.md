# TradePilot AI — Production Starter

This is the first real, structured TradePilot AI codebase.

## Included

- Next.js App Router application
- Responsive landing page
- Production-style dashboard
- AI chat endpoint using the OpenAI Responses API
- Supabase authentication structure
- Supabase database schema with Row Level Security
- Stripe subscription Checkout endpoint
- PWA manifest
- Environment-variable template
- Educational-risk language

## Run locally

You need Node.js installed.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`.

The dashboard works before external services are connected. Login, real AI responses,
and payments activate after adding the appropriate environment variables.

## Required owner accounts

Create these only when ready:

1. GitHub — source-code ownership and version history.
2. Vercel — hosting and automatic deployment.
3. Supabase — authentication and database.
4. OpenAI Platform — AI API key and usage billing.
5. Stripe — subscription payments.
6. Market-data provider — licensed stock prices/news.

Never send secret API keys through chat, commit them to GitHub, or place them in
browser-visible code. Add them through `.env.local` and Vercel environment variables.

## First deployment path

1. Create a GitHub repository named `tradepilot-ai`.
2. Upload the contents of this folder.
3. Import the repository into Vercel.
4. Deploy.
5. Add Supabase, OpenAI, and Stripe variables afterward.

## Compliance boundary for version one

TradePilot should initially be marketed as an educational research and information tool.
Avoid automatic trade execution and personalized directives such as exact buy/sell
instructions or allocations until qualified legal counsel reviews the product.

## Not finished yet

A real launch still needs:
- Email signup/verification flow
- Protected dashboard routes
- Stripe webhook and subscription synchronization
- Licensed live market-data integration
- News provider
- Alert scheduler
- Privacy Policy, Terms, disclosures, and support pages
- Monitoring, analytics, backups, security testing
- Legal and compliance review
