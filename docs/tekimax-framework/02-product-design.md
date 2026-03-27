# TEKIMAX Framework: Product Design & Custom Solutions

## Overview
This document outlines the engineering and design standards for all internal TEKIMAX applications (e.g., Adaptive Startup) and custom SaaS solutions engineered for our enterprise clients. Our goal is to architect software that enforces the Human-Centered AI (HCAI) philosophy at the codebase and UI/UX level.

---

## Application Architecture Standards

### 1. The Telemetry Layer (Cooperation Tracking)
Every application built by TEKIMAX must include a unified analytics layer capable of tracking the origin of data creation.
- **Data Schemas:** All relevant database tables/collections must include `source` and `tags` columns.
- **Boolean Flags:** UI and API layers must explicitly pass `source: "AI"` or `source: "Human"` during mutations.
- **Weighted Analytics:** The backend must aggregate these events using weighted variables (e.g., Macro, Mid, Micro) to calculate the client's localized **Truthfulness Index**.

### 2. UI/UX: The "Pilot" Interface
Our design language (currently Brutalist/High-Contrast) must visually distinguish the human-computer boundary.
- **Ambient Awareness:** Applications should feature a persistent, global indicator (like the Truthfulness Badge) showing the user's current Human-AI ratio to promote self-correction.
- **Generative Friction:** "Auto-Generate" buttons must not be visually dominant over "Create Manually" buttons. When AI generates content, it must be presented in a staging/draft state requiring human modification or explicit approval before committing to the main database.
- **Lineage Markers:** AI-generated content (paragraphs, metrics, canvases) should carry subtle visual markers (e.g., a spark icon or specific border color) indicating its non-human origin until a human significantly edits it.

---

## Custom Client Solutions

When architecting proprietary software for Fortune 500, mid-market, or agency clients, we apply the TEKIMAX HCAI Integration Methodology:

### Phase 1: Workflow Auditing
We map the client's desired outcome and identify which processes require **Determinism** (human decision) vs **Probabilism** (AI generation).

### Phase 2: System Boundaries
We define hard limits on the LLM's agency. Examples:
- *Authorized:* Summarizing meeting notes, drafting initial boilerplate code, executing cross-referenced data searches.
- *Unauthorized (Requires Human Gate):* Executing financial transfers, finalizing performance reviews, sending unreviewed external communications.

### Phase 3: The Dashboard Handover
Custom solutions are shipped with an "Executive HCAI Dashboard." This allows the client's leadership to track how heavily their workforce relies on the AI, measuring ROI while ensuring their human talent isn't atrophying.

---

## Development Axioms for Engineers
1. **Never hide the prompt:** If an app is running an AI macro, the user should be able to view (and potentially tweak) the parameters driving it.
2. **Graceful degradation:** If the LLM provider experiences an outage, the application must still function as a premium manual tool. AI is an enhancement, not a life-support system.
3. **Data Sovereignty:** Client data used to prompt the AI must adhere strictly to local compliance, avoiding cross-contamination of models.
