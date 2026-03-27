<div align="center">
  <img width="1200" alt="Adaptive Startup Header" src="/images/pillaros_header.png" />
</div>

# Adaptive Startup - The Operating System for Founders

**Adaptive Startup** is a comprehensive, full-stack platform designed to help startup founders build, manage, and scale their ventures. From ideation to exit, Adaptive Startup provides the essential tools to streamline your startup journey.

## 🚀 Key Features

Adaptive Startup offers a unified suite of tools categorized to support every stage of your business:

### 🧠 Strategy & Planning
- **Business Model Canvas**: Interactive canvas to outline and iterate on your business model dynamically.
- **OKR & Goal Setting**: Set objectives and key results to align your team and track progress.
- **Product Roadmap**: Visual planning tool to manage feature development and timelines.
- **Market Research**: Tools to calculate and visualize TAM, SAM, and SOM.
- **Competitor Analysis**: Track rival companies, funding, and feature sets with AI-powered insights.

### 🤝 Customer & Team
- **Customer Discovery**: Log interviews, extract insights, and validate hypotheses.
- **Team Management**: Manage roles, permissions, and organizational structure.
- **Grant Audit**: AI-assisted tool to find and evaluate grant opportunities.

### 💰 Finance & Legal
- **Financial Modeling**: Create revenue projections and cost models.
- **Deck Builder**: Create professional pitch decks to secure funding.
- **Equity Management**: Manage cap tables, generate SAFE agreements, and handle vesting schedules.
- **Legal Documents**: Generate and manage essential legal agreements (NDAs, IP Assignment, etc.).

### 📝 Content & Growth
- **Blog Management**: Full CMS with markdown support, RSS feeds, and SEO optimization.
- **Document Management**: Securely store white papers, business plans, and internal docs.

### 📚 Documentation
- [Adaptive Learning System Analysis Report](docs/Adaptive_Learning_Analysis.md): Detailed analysis of the system's AI capabilities and future roadmap.

## 🛠️ Tech Stack 

This project is built with a modern, high-performance stack:

- **Frontend**: [React](https://reactjs.org/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: [Convex](https://convex.dev/) (Backend-as-a-Service)
- **AI**: [Google Gemini Pro](https://deepmind.google/technologies/gemini/) (via `@google/genai`)
- **Authentication**: [WorkOS](https://workos.com/)
- **Payments**: [Stripe](https://stripe.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Deployment**: [Cloudflare Pages](https://pages.cloudflare.com/)

## 💻 Running Locally

Follow these steps to get Adaptive Startup running on your local machine.

### Prerequisites
- Node.js (v18+)
- npm or pnpm
- A Google Gemini API Key
- Convex Account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TEKIMAX/Adaptive Startup.git
   cd Adaptive Startup
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   # .env.local
   GEMINI_API_KEY=your_gemini_api_key_here
   VITE_CONVEX_URL=your_convex_url_here
   ```

4. **Initialize Convex:**
   ```bash
   npx convex dev
   ```
   This will sync your backend functions and schema.

5. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal) to view the app.

## 📦 Deployment

### Deploying Backend (Convex)
Your backend is automatically deployed when you run `npx convex deploy` or push to the connected branch.

```bash
npx convex deploy
```

### Deploying Frontend (Cloudflare Pages / Vercel)
Build the project for production:

```bash
npm run build
```

The output will be in the `dist` folder, ready for deployment to any static hosting service.

## 📄 License
Private - Copyright © 2024 TEKIMAX. All rights reserved.
