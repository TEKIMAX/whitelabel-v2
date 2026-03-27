# GEMINI.md

## Project Overview

This project is a full-stack AI-powered web application called "Adaptive Startup", designed to be a comprehensive platform for startup founders. It provides a suite of tools to help founders develop and manage their business, including:

*   **Business Model Canvas:** To outline and iterate on the business plan.
*   **Goal Setting (OKRs):** To set and track objectives and key results.
*   **Market Research:** To analyze market size (TAM, SAM, SOM).
*   **Competitor Analysis:** To track and compare competitors.
*   **Customer Development:** To log and analyze customer interviews.
*   **Product Roadmap:** To plan and manage feature development.
*   **Financial Modeling:** To create revenue and cost models.
*   **Pitch Deck Builder:** To create and manage presentations.
*   **Document Management:** To store and manage white papers and business plans.
*   **Team Management & Equity:** To manage team members and SAFE agreements.
*   **Legal Documents:** To generate and manage legal agreements.

The application is built using the following technologies:

*   **Frontend:** React, Vite, TypeScript, Tailwind CSS (implied by the presence of `tailwind.config.js` and common class names in the code)
*   **Backend:** Convex (a backend-as-a-service platform)
*   **AI:** Google Gemini API
*   **Authentication:** WorkOS
*   **Payments:** Stripe
*   **Deployment:** Cloudflare Pages

## Building and Running

**Prerequisites:**

*   Node.js
*   A Gemini API key

**Instructions:**

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Set up environment variables:**

    Create a `.env.local` file in the root of the project and add your Gemini API key:

    ```
    GEMINI_API_KEY=your_gemini_api_key
    ```

3.  **Run the development server:**

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:3000`.

4.  **Build for production:**

    ```bash
    npm run build
    ```

5.  **Deploy to Cloudflare Pages:**

    ```bash
    npm run deploy
    ```

## Development Conventions

*   **Code Style:** The project uses Prettier for code formatting (inferred from `.prettierrc` if it exists, or common formatting in the code). ESLint is likely used for linting (inferred from `.eslintrc.js` if it exists).
*   **Testing:** There are no explicit testing configurations or files in the provided file listing. It is recommended to add a testing framework like Jest or Vitest to the project.
*   **State Management:** The project uses Zustand for global state management.
*   **Component Library:** The project uses a combination of custom components and components from `lucide-react` for icons.
*   **Routing:** The project does not seem to have a dedicated routing library like React Router. Routing is likely handled by the application logic itself.
