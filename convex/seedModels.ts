import { mutation } from "./_generated/server";

export const run = mutation({
  handler: async (ctx) => {
    const models = [
      { isDefault: true, modelId: "anthropic/claude-3-haiku", provider: "Anthropic" },
      { isDefault: false, modelId: "anthropic/claude-3-opus", provider: "Anthropic" },
      { isDefault: false, modelId: "anthropic/claude-3.5-sonnet", provider: "Anthropic" },
      { isDefault: false, modelId: "google/gemini-2.5-flash", provider: "Google" },
      { isDefault: false, modelId: "google/gemini-2.5-flash-lite", provider: "Google" },
      { isDefault: false, modelId: "google/gemini-2.5-pro", provider: "Google" },
      { isDefault: false, modelId: "inception/mercury", provider: "Inception" },
      { isDefault: false, modelId: "mistralai/mistral-medium-3.1", provider: "Mistralai" },
      { isDefault: false, modelId: "openai/gpt-5", provider: "OpenAI" },
      { "isDefault": false, "modelId": "perplexity/sonar", "provider": "Perplexity" },
      { isDefault: false, modelId: "qwen/qwen3-235b-a22b-thinking-2507", provider: "Qwen" }
    ];

    const existing = await ctx.db
      .query("model_config")
      .withIndex("by_org", (q) => q.eq("orgId", "_global"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        selectedModels: models,
        updatedAt: Date.now()
      });
      return "Updated existing config";
    }

    await ctx.db.insert("model_config", {
      orgId: "_global",
      selectedModels: models,
      billingCycle: "monthly",
      updatedAt: Date.now()
    });
    return "Inserted new config";
  }
});
