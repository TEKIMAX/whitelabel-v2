# Whitelabel App — Overview

## What Is It?

The Whitelabel App is a **provisioned tenant application** — a full-stack React + Convex SaaS deployed per-customer by the [provisioner](/). Each customer (tenant) gets their own isolated deployment with:

- Independent Cloudflare Pages frontend
- Independent Convex backend
- One linked WorkOS organization (the tenant org)
- Branding, models, and personality configured by the provisioner

## Product Description

The app is an **AI-powered operating system for early-stage founders and ventures**. Tenants (incubators, accelerators, workforce programs, enterprise teams) deploy it to their portfolio companies or program participants.

Feature domains:

| Domain | What it provides |
|---|---|
| **Strategy** | Business Model Canvas (Lean Canvas 2.0), OKRs, product roadmap |
| **Market** | TAM/SAM/SOM calculators, bottom-up sizing, competitor analysis |
| **Customer** | Interview tracking, sentiment analysis, customer discovery pipeline |
| **Finance** | Revenue modeling, pitch deck builder, equity/cap table, SAFE generator |
| **Legal** | NDA, IP assignment, contract generation |
| **Content** | Blog CMS, document management, Tiptap rich text editor |
| **Team** | RBAC, invitations, venture workspaces |
| **AI** | Multi-model chat, 19 specialized AI action modules, adaptive learning |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, TypeScript, Tailwind CSS |
| Backend | Convex BaaS (real-time, reactive) |
| Auth | WorkOS (Magic Auth, PKCE) |
| AI | Google Gemini, Ollama, Vercel AI SDK |
| Payments | Stripe, @convex-dev/stripe |
| Storage | Cloudflare R2 (S3-compatible) |
| Functions | Cloudflare Pages Functions (CF Workers) |
| State | Zustand 5 |
| Editor | Tiptap (ProseMirror) |
| UI | Radix UI, Framer Motion, Recharts |

## How It Fits in the Platform

```
Provisioner Portal (portal.tekimax.com)
  └─► Provisions a deployment
        ├─► Creates Convex project
        ├─► Deploys CF Pages (this app)
        ├─► Creates 1 WorkOS org (tenant org)
        └─► Injects WORKOS_ORG_ID + DEPLOYMENT_ID

Whitelabel App (tenant.pages.dev)
  ├─► Convex backend (tenant data — ventures, canvas, AI, billing)
  ├─► CF Functions (auth, org membership API)
  └─► Users create Ventures (Convex records, NOT WorkOS orgs)
```

See [Architecture](/architecture) for the full system diagram.

## Version

Current app version: **1.15.0**
