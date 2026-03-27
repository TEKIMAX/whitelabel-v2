"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { callAI } from "./shared";

/**
 * AI Interview Script Generator
 * Generates customer discovery interview questions cross-referenced with
 * canvas data, market research, revenue model, and existing interviews.
 * Outputs well-structured Markdown (like the Market Research report).
 */
export const generateInterviewScript = action({
    args: {
        problem: v.string(),
        segments: v.string(),
        businessName: v.optional(v.string()),
        modelName: v.optional(v.string()),
        // Cross-referenced startup context
        canvasData: v.optional(v.any()),
        marketData: v.optional(v.any()),
        revenueModel: v.optional(v.any()),
        existingInterviews: v.optional(v.any()),
        competitors: v.optional(v.any()),
        goals: v.optional(v.any()),
        targetName: v.optional(v.string()),
        targetRole: v.optional(v.string()),
        targetDomain: v.optional(v.string()),
        targetIndustry: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        // Build cross-reference context
        const canvasContext = args.canvasData ? `
BUSINESS MODEL CANVAS:
- Value Proposition: ${args.canvasData.valuePropositions || 'N/A'}
- Customer Segments: ${args.canvasData.customerSegments || args.segments}
- Channels: ${args.canvasData.channels || 'N/A'}
- Revenue Streams: ${args.canvasData.revenueStreams || 'N/A'}
- Cost Structure: ${args.canvasData.costStructure || 'N/A'}
- Key Partners: ${args.canvasData.keyPartners || 'N/A'}
- Unfair Advantage: ${args.canvasData.unfairAdvantage || 'N/A'}` : '';

        const marketContext = args.marketData ? `
MARKET RESEARCH DATA:
- TAM: $${args.marketData.tam || 'N/A'}
- SAM: $${args.marketData.sam || 'N/A'}
- SOM: $${args.marketData.som || 'N/A'}` : '';

        const revenueContext = args.revenueModel ? `
REVENUE MODEL:
- Business Model Type: ${args.revenueModel.businessModelType || 'N/A'}
- Revenue Streams: ${args.revenueModel.revenueStreams?.map((s: any) => `${s.name} ($${s.price}/${s.frequency})`).join(', ') || 'N/A'}
- Monthly Growth Rate: ${args.revenueModel.monthlyGrowthRate || 'N/A'}%
- Churn Rate: ${args.revenueModel.churnRate || 'N/A'}%
- CAC: $${args.revenueModel.cac || 'N/A'}` : '';

        const existingInsights = args.existingInterviews?.length > 0 ? `
EXISTING INTERVIEW INSIGHTS (${args.existingInterviews.length} interviews so far):
${args.existingInterviews.slice(0, 5).map((i: any) => `- ${i.Name || 'Unknown'} (${i.Role || 'N/A'}): Pain Points: ${i['Pain Points'] || 'N/A'} | Notes: ${(i.Notes || '').substring(0, 100)}`).join('\n')}` : '';

        const competitorsContext = args.competitors?.length > 0 ? `
COMPETITORS:
${args.competitors.map((c: any) => `- ${c.name}: ${c.differentiator}`).join('\n')}` : '';

        const goalsContext = args.goals?.length > 0 ? `
STRATEGIC GOALS:
${args.goals.map((g: string) => `- ${g}`).join('\n')}` : '';

        const targetContext = (args.targetName || args.targetRole || args.targetDomain) ? `
TARGET INTERVIEWEE:
- Name: ${args.targetName || 'TBD'}
- Role: ${args.targetRole || 'TBD'}
- Company/Domain: ${args.targetDomain || 'TBD'}
- Industry: ${args.targetIndustry || 'TBD'}` : '';

        const prompt = `
You are an expert customer discovery coach helping an early-stage startup founder prepare for customer interviews.

**Business:** ${args.businessName || "Unnamed startup"}
**Problem Statement:** ${args.problem}
**Target Customer Segments:** ${args.segments}
${canvasContext}
${marketContext}
${revenueContext}
${competitorsContext}
${goalsContext}
${existingInsights}
${targetContext}

Generate a comprehensive set of 10 customer interview questions. Output as **well-structured Markdown** with the following format:

# Interview Script: ${args.targetName || args.targetRole || 'Customer Discovery'}

> **Business:** ${args.businessName || 'Startup'} | **Target:** ${args.targetName || 'Prospect'} (${args.targetRole || 'Role'}) at ${args.targetDomain || 'Company'}

---

## Problem Validation (Questions 1–3)
*Validate whether the problem truly exists for this customer.*

### Q1: [Question text here]
> **Rationale:** Why this question matters, referencing specific startup context.

### Q2: ...

## Current Solutions (Questions 4–5)
*Understand how they currently solve this problem and switching costs.*

### Q4: ...

## Pricing & Willingness to Pay (Questions 6–7)
*Gauge pricing sensitivity using the startup's revenue model context.*

### Q6: ...

## Priority & Urgency (Questions 8–9)
*Determine how urgent this problem is relative to other challenges.*

### Q8: ...

## Discovery & Unknowns (Question 10)
*Uncover blind spots and expand understanding.*

### Q10: ...

---

## Interview Tips
- Brief tips for conducting this specific interview based on context.

Rules:
- Questions MUST be open-ended (no yes/no questions)
- Questions should be conversational, not interrogative
- Avoid leading questions that suggest a desired answer
- Cross-reference the canvas, market data, and revenue model when crafting questions
- If existing interview data is available, avoid repeating questions already answered
- Each rationale should explain WHY this specific question matters for THIS startup
        `.trim();

        try {
            const text = await callAI(
                ctx,
                prompt,
                "You are a customer discovery expert who helps founders craft interview questions that avoid confirmation bias. Output well-structured Markdown with headers, blockquotes, and clear formatting. Do NOT output JSON.",
                undefined,
                undefined,
                0,
                [],
                args.modelName || "cloud"
            );
            // Strip any thinking tags and return clean markdown
            return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        } catch (e) {
            return `# Interview Script: ${args.targetName || 'Customer Discovery'}

> **Business:** ${args.businessName || 'Startup'} | Failed to generate AI questions — using fallback.

---

## Problem Validation

### Q1: Tell me about a time when you experienced this problem. What happened?
> **Rationale:** Opens with a concrete story to validate the problem exists.

### Q2: How frequently do you encounter this issue?
> **Rationale:** Determines severity and frequency of the pain point.

### Q3: What's the biggest frustration you face with the current situation?
> **Rationale:** Surfaces emotional drivers that indicate willingness to change.

## Current Solutions

### Q4: How are you currently dealing with this challenge?
> **Rationale:** Reveals existing solutions and switching costs.

### Q5: What tools or processes have you tried? What worked and what didn't?
> **Rationale:** Maps the competitive landscape from the customer's perspective.

## Pricing

### Q6: If a solution existed that solved this completely, what would it be worth to you?
> **Rationale:** Tests willingness to pay without anchoring to a specific number.

### Q7: How much time or money do you currently spend working around this problem?
> **Rationale:** Establishes a baseline cost of the status quo.

## Priority

### Q8: Where does this problem rank among your top 3 business challenges?
> **Rationale:** Helps prioritize whether this is a vitamin or painkiller.

### Q9: What would need to happen for you to take action on solving this in the next 30 days?
> **Rationale:** Tests urgency and buying timeline.

## Discovery

### Q10: What question should I have asked that I didn't?
> **Rationale:** Uncovers unknown unknowns that the founder may be blind to.
`;
        }
    }
});
