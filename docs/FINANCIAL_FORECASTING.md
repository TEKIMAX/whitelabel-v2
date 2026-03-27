# Financial Forecasting Page — Developer Guide

> **Audience**: Senior Design Class students building a financial forecasting module for a startup platform.
>
> **Goal**: Build a page where founders can input their business assumptions, see a month-by-month financial projection table, and chat with an AI assistant about their financials.

---

## 1. Page Inputs

> **What are these?** These are the editable fields a founder fills in to describe their business model. Think of them as the "assumptions" that power every calculation. The forecasting engine takes these inputs and projects revenue, costs, and profitability over time.

| Input | Type | Default | What It Means |
|-------|------|---------|---------------|
| Business Model Type | `select` | `"SaaS"` | How the company makes money. **SaaS** = monthly subscriptions. **Marketplace** = takes a cut of transactions. **E-commerce** = sells products. **Services** = charges for time/expertise. |
| Starting Users | `number` | `0` | How many paying customers the startup has at Month 0 (today). This is the baseline everything grows from. |
| Monthly Growth Rate (%) | `number` | `15` | What percentage of new users the startup gains each month. A 15% growth rate means if you have 100 users this month, you gain 15 next month. **Bounded 0–100.** |
| Monthly Churn Rate (%) | `number` | `5` | What percentage of users cancel/leave each month. Churn is the "leaky bucket" — even if you're growing, you're always losing some users too. |
| Customer Acquisition Cost ($) | `number` | `0` | How much it costs to acquire one new customer (ads, sales, marketing). This is critical for understanding if the business is sustainable. |
| Forecast Horizon | `select` | `24` | How many months into the future to project. Common choices: 12 (1 year), 24 (2 years), 36 (3 years). Investors typically want to see 24–36 months. |
| Scenario | `toggle` | `"Base"` | Allows the user to model best-case, worst-case, and expected outcomes. More on this in the Scenario section below. |

### Revenue Streams

> **What is this?** A revenue stream is a specific way the company charges customers. A SaaS company might have a "Basic Plan" at $19/month and a "Pro Plan" at $49/month. Each stream is a row with:

- `name` — Label (e.g., "Pro Subscription")
- `price` — How much is charged per unit
- `frequency` — `"Monthly"` (recurring) or `"One-time"` (single purchase)

### Cost Structure

> **What is this?** These are the company's operating expenses — what it costs to run the business. Examples: server hosting, salaries, office rent, marketing spend. Each cost has:

- `name` — Label (e.g., "AWS Hosting")
- `amount` — Dollar amount
- `frequency` — `"Monthly"`, `"One-time"`, or `"Yearly"`
- `growthRate` — Optional: how much this cost increases each month (e.g., server costs grow as users grow)

---

## 2. Data Schema

> **What is a schema?** A schema defines the **shape** of data — what fields exist, what types they are, and how objects relate to each other. When you build your database tables or API payloads, these are the JSON structures you'll work with.

### Revenue Model Settings

> This is the main settings object that stores all the forecast assumptions. Save this to your database per project.

```json
{
  "businessModelType": "SaaS",
  "startingUsers": 100,
  "monthlyGrowthRate": 15,
  "churnRate": 5,
  "cac": 50,
  "modelDescription": "B2B SaaS with monthly subscriptions"
}
```

### Revenue Stream

```json
{
  "id": "uuid",
  "name": "Pro Plan",
  "price": 49.99,
  "frequency": "Monthly"
}
```

### Cost Item

```json
{
  "id": "uuid",
  "name": "AWS Hosting",
  "amount": 500,
  "frequency": "Monthly",
  "category": "Infrastructure",
  "growthRate": 5,
  "source": "Human"
}
```

- `source` tracks whether the item was added manually (`"Human"`) or suggested by AI (`"AI"`)

### Market Data (for ceiling)

> **What is this?** Market sizing data sets an upper bound on how large the company can theoretically grow. If the obtainable market (SOM) is $1.5B and each user pays $500/year, you can't have more than 3 million users no matter how fast you grow.

```json
{
  "tam": 50000000000,
  "sam": 5000000000,
  "som": 1500000000
}
```

- **TAM** (Total Addressable Market): The entire global demand for this type of product
- **SAM** (Serviceable Available Market): The portion TAM you can realistically target (geography, segment)
- **SOM** (Serviceable Obtainable Market): What you can actually capture in the next 1–3 years

### Saved Forecast Scenario

> Users should be able to save multiple "what-if" scenarios (e.g., "Conservative", "With Series A funding") and load them later.

```json
{
  "id": "uuid",
  "name": "Q1 2025 Base Case",
  "type": "base",
  "inputs": { "...RevenueModelSettings" },
  "result": { "...ForecastResult" },
  "createdAt": 1708300000000
}
```

---

## 3. Projection Table

> **What is this?** The projection table is the main output of the forecasting engine. It takes all the inputs from Section 1 and generates a row for each month in the forecast horizon. This is what investors look at to understand the financial trajectory of the business.

### Table Columns

| Column | Formula | Format | What It Means |
|--------|---------|--------|---------------|
| **Month** | `1, 2, 3, …` | `#` | The forecast month number |
| **Users** | See formula below | `#,###` | Total paying customers at the end of this month |
| **MRR** | `Users × ARPU_monthly` | `$#,###` | Monthly Recurring Revenue — how much comes in this month |
| **ARR** | `MRR × 12` | `$#,###` | Annual Run Rate — if this month repeated for a year |
| **Total Expenses** | Sum of all costs | `$#,###` | What the company spends this month |
| **Net Income** | `MRR - Expenses` | `$#,###` | Profit (green) or loss (red) this month |
| **Cash Balance** | Running sum of Net Income | `$#,###` | How much cash the company has left |
| **Burn Rate** | `abs(Net Income)` if negative | `$#,###` | How much cash the company loses per month (only when unprofitable) |
| **Runway** | `Cash Balance / Burn Rate` | `# months` | How many months until the company runs out of cash |

### Calculation Details

**Monthly Users** — This is the core growth engine:
```
Users(0) = startingUsers                             ← the baseline
Users(m) = Users(m-1) × (1 + growthRate/100)         ← add new users
                      × (1 - churnRate/100)           ← subtract users who left
```

> **Example**: Start with 100 users, 15% growth, 5% churn:
> - Month 1: `100 × 1.15 × 0.95 = 109 users`
> - Month 2: `109 × 1.15 × 0.95 = 119 users`
> - The net effect is ~9.25% real growth per month

**Monthly Revenue (ARPU):**

> **ARPU** = Average Revenue Per User. It's calculated from the revenue streams:

```
ARPU_monthly = sum(stream.price for Monthly streams)
             + sum(stream.price / 12 for One-time streams)

MRR = Users × ARPU_monthly
```

> **Example**: A $49/month Pro Plan + a $299 one-time setup fee:
> - ARPU_monthly = $49 + ($299 / 12) = $49 + $24.92 = $73.92
> - With 109 users: MRR = 109 × $73.92 = $8,057

**Monthly Expenses:**
```
For each cost item:
  Monthly  → amount × (1 + growthRate/100)^month    ← costs that grow over time
  Yearly   → amount / 12                             ← spread evenly
  One-time → amount (only in month 0)                ← charged once
```

> **Example**: AWS hosting starts at $500/month with 5% monthly growth:
> - Month 0: $500
> - Month 6: $500 × 1.05^6 = $670
> - Month 12: $500 × 1.05^12 = $898

### Scenario Multipliers

> **What are scenarios?** Scenarios let founders see their numbers under different assumptions without manually changing every input. The multipliers adjust the core inputs:

| Scenario | Growth × | Churn × | Cost × | When to Use |
|----------|----------|---------|--------|-------------|
| **Optimistic** | 1.3 | 0.7 | 0.9 | Best case — product goes viral, costs stay low |
| **Base** | 1.0 | 1.0 | 1.0 | Expected case — your actual assumptions |
| **Pessimistic** | 0.7 | 1.3 | 1.2 | Worst case — slower growth, more churn, higher costs |

> **Example**: If base growth is 15%, optimistic = 15% × 1.3 = 19.5%, pessimistic = 15% × 0.7 = 10.5%

### Market Ceiling

> **Why cap growth?** Without a ceiling, the math will project infinite growth. In reality, a market has a finite size. If the SOM is $1.5B and each user pays $600/year, the max possible users is 2.5 million.

```
maxUsers = SOM / (ARPU_monthly × 12)
Users(month) = min(calculatedUsers, maxUsers)
```

---

## 4. Summary KPI Cards

> **What are KPIs?** Key Performance Indicators — the critical numbers investors and founders look at first. Display these as prominent cards above or beside the projection table.

| KPI | Formula | Why It Matters |
|-----|---------|----------------|
| **Break-even Month** | First month where `Net Income ≥ 0` | When the company becomes profitable — this is the #1 question investors ask |
| **Year 1 ARR** | `Month 12 MRR × 12` | How big the business is after one year |
| **Year 2 ARR** | `Month 24 MRR × 12` | Growth trajectory — investors want to see 2–3× year-over-year |
| **Peak Burn Rate** | `max(Burn Rate)` across all months | The worst-case monthly cash drain — determines how much funding is needed |
| **LTV** | `ARPU_monthly / (churnRate / 100)` | Lifetime Value — total revenue from one customer before they churn. Higher = better |
| **LTV:CAC Ratio** | `LTV / CAC` | The holy grail metric. If it costs $50 to acquire a customer who pays you $300 over their lifetime, that's a 6:1 ratio. **Target ≥ 3:1** |
| **CAC Payback** | `CAC / ARPU_monthly` (months) | How many months to recoup the cost of acquiring one customer. **Target ≤ 12 months** |

---

## 5. API Endpoints (to build)

> **What are these?** These are the backend endpoints your server needs to expose. The frontend (React, Vue, etc.) will call these to load data, save changes, and generate forecasts. You can build these in **any language** — Go, Python, Node.js, etc.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/forecast/{projectId}` | Generate forecast from saved inputs |
| `GET` | `/api/forecast/{projectId}?months=36&scenario=optimistic` | Parameterized forecast |
| `GET` | `/api/revenue-streams/{projectId}` | List all revenue streams for a project |
| `POST` | `/api/revenue-streams` | Create a revenue stream (`name`, `price`, `frequency`) |
| `PATCH` | `/api/revenue-streams/{id}` | Update a revenue stream |
| `DELETE` | `/api/revenue-streams/{id}` | Delete a revenue stream |
| `GET` | `/api/costs/{projectId}` | List all cost items for a project |
| `POST` | `/api/costs` | Create a cost item (`name`, `amount`, `frequency`, `growthRate`) |
| `PATCH` | `/api/costs/{id}` | Update a cost item |
| `DELETE` | `/api/costs/{id}` | Delete a cost item |
| `POST` | `/api/forecast/scenarios` | Save a forecast scenario snapshot |
| `GET` | `/api/forecast/scenarios/{projectId}` | List all saved scenarios |

### Forecast Response Shape

> This is what the `GET /api/forecast/{projectId}` endpoint should return. The frontend will use this to render the table and KPI cards.

```json
{
  "settings": {
    "businessModelType": "SaaS",
    "startingUsers": 100,
    "monthlyGrowthRate": 15,
    "churnRate": 5,
    "cac": 50
  },
  "forecast": [
    {
      "month": 1,
      "users": 109,
      "mrr": 8057,
      "arr": 96684,
      "expenses": 4200,
      "netIncome": 3857,
      "cashBalance": 3857,
      "burnRate": 0,
      "runway": null
    },
    {
      "month": 2,
      "users": 119,
      "mrr": 8798,
      "arr": 105576,
      "expenses": 4310,
      "netIncome": 4488,
      "cashBalance": 8345,
      "burnRate": 0,
      "runway": null
    }
  ],
  "summary": {
    "breakEvenMonth": 1,
    "peakBurnRate": 0,
    "yearOneARR": 245000,
    "yearTwoARR": 890000,
    "ltvCacRatio": 4.2,
    "cacPaybackMonths": 2.8
  }
}
```

---

## 6. AI Chat Integration

> **What is this?** The forecasting page should include an AI chat panel where founders can ask questions about their financial model in natural language. The AI reads the current forecast data and gives actionable advice.

### What the AI Should Be Able To Do

| Capability | Example Prompt |
|-----------|----------------|
| Analyze current forecast | *"What does my runway look like?"* |
| Suggest improvements | *"How can I reduce my burn rate?"* |
| Compare scenarios | *"Compare base vs optimistic projections"* |
| Generate cost suggestions | *"What costs should a SaaS startup expect?"* |
| Funding advice | *"When should I raise based on my runway?"* |
| Explain metrics | *"What does LTV:CAC ratio mean for my business?"* |

### Context Payload for AI

> **Why?** The AI needs to "see" the founder's financial data to give useful answers. Before sending a chat message to the AI, package the current state into a context object and include it in the prompt.

```json
{
  "businessModelType": "SaaS",
  "startingUsers": 100,
  "monthlyGrowthRate": 15,
  "churnRate": 5,
  "cac": 50,
  "revenueStreams": [
    { "name": "Pro Plan", "price": 49.99, "frequency": "Monthly" }
  ],
  "costStructure": [
    { "name": "AWS", "amount": 500, "frequency": "Monthly" }
  ],
  "currentMRR": 8057,
  "currentARR": 96684,
  "burnRate": 0,
  "runway": null,
  "breakEvenMonth": 1,
  "tam": 50000000000,
  "sam": 5000000000,
  "som": 1500000000
}
```

> **Tip**: Stringify this and prepend it to the user's chat message as a system prompt. The AI will then have full context to give specific, data-driven answers instead of generic advice.

---

## 7. AI Function Calling (Tools)

> **What is function calling?** Normally, an AI model can only generate text. But with **function calling** (also called "tools"), you can teach the model about functions in your codebase — like `get_forecast()` or `add_cost()` — and the model will decide when to call them based on the user's message. The model doesn't execute the function itself; it returns a structured request saying *"call this function with these arguments"*, and your code executes it.

> **Why does this matter for forecasting?** Instead of the AI just chatting about finances, it can actually **take actions** — recalculate the forecast with different growth rates, add a new cost item, or compare scenarios — all triggered by natural language.

### How It Works (Step by Step)

```
1. User says: "What happens if I increase growth to 20%?"
2. Your app sends the message + a list of available tools to the AI
3. The AI responds: "Call update_forecast with { growthRate: 20 }"
4. Your code runs update_forecast(growthRate=20) and gets the result
5. You send the result back to the AI
6. The AI responds with a human-readable summary of the new forecast
```

### Defining Tools for Forecasting

> You define tools as JSON objects that describe the function name, what it does, and what parameters it accepts. Here are the tools relevant to the forecasting page:

```json
[
  {
    "type": "function",
    "function": {
      "name": "generate_forecast",
      "description": "Generate a financial forecast with given parameters. Returns monthly projections of users, revenue, expenses, and cash balance.",
      "parameters": {
        "type": "object",
        "properties": {
          "startingUsers": {
            "type": "number",
            "description": "Number of users at month 0"
          },
          "monthlyGrowthRate": {
            "type": "number",
            "description": "Monthly user growth percentage (e.g., 15 = 15%)"
          },
          "churnRate": {
            "type": "number",
            "description": "Monthly churn percentage (e.g., 5 = 5%)"
          },
          "months": {
            "type": "number",
            "description": "Number of months to forecast (default 24)"
          },
          "scenario": {
            "type": "string",
            "description": "Scenario type: base, optimistic, or pessimistic"
          }
        },
        "required": ["startingUsers", "monthlyGrowthRate", "churnRate"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "add_cost_item",
      "description": "Add a new operating expense to the financial model",
      "parameters": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of the expense (e.g., 'AWS Hosting')"
          },
          "amount": {
            "type": "number",
            "description": "Amount in dollars"
          },
          "frequency": {
            "type": "string",
            "description": "How often: Monthly, Yearly, or One-time"
          }
        },
        "required": ["name", "amount", "frequency"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "compare_scenarios",
      "description": "Compare base, optimistic, and pessimistic forecast scenarios side by side",
      "parameters": {
        "type": "object",
        "properties": {
          "months": {
            "type": "number",
            "description": "Forecast horizon to compare"
          }
        },
        "required": ["months"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "calculate_runway",
      "description": "Calculate how many months of cash runway the startup has given current burn rate and cash balance",
      "parameters": {
        "type": "object",
        "properties": {
          "cashBalance": {
            "type": "number",
            "description": "Current cash in the bank"
          },
          "monthlyBurnRate": {
            "type": "number",
            "description": "Monthly cash burn (expenses minus revenue)"
          }
        },
        "required": ["cashBalance", "monthlyBurnRate"]
      }
    }
  }
]
```

### Python Example (Ollama)

```python
import ollama
import json

# 1. Define the tools
tools = [
    {
        'type': 'function',
        'function': {
            'name': 'generate_forecast',
            'description': 'Generate a financial forecast with given parameters',
            'parameters': {
                'type': 'object',
                'properties': {
                    'startingUsers': {'type': 'number', 'description': 'Users at month 0'},
                    'monthlyGrowthRate': {'type': 'number', 'description': 'Growth % per month'},
                    'churnRate': {'type': 'number', 'description': 'Churn % per month'},
                    'months': {'type': 'number', 'description': 'Forecast horizon'},
                    'scenario': {'type': 'string', 'description': 'base, optimistic, or pessimistic'},
                },
                'required': ['startingUsers', 'monthlyGrowthRate', 'churnRate'],
            },
        },
    },
]

# 2. Send user message + tools to the model
response = ollama.chat(
    model='llama3.1',
    messages=[{'role': 'user', 'content': 'What happens if I grow at 25% per month starting with 50 users?'}],
    tools=tools,
)

# 3. Check if the model wants to call a function
tool_calls = response['message'].get('tool_calls', [])
if tool_calls:
    for call in tool_calls:
        func_name = call['function']['name']       # e.g., "generate_forecast"
        func_args = call['function']['arguments']   # e.g., {"startingUsers": 50, "monthlyGrowthRate": 25, ...}

        # 4. YOUR CODE executes the function
        result = your_forecast_function(**func_args)

        # 5. Send result back to the model for a human-readable summary
        follow_up = ollama.chat(
            model='llama3.1',
            messages=[
                {'role': 'user', 'content': 'What happens if I grow at 25% per month starting with 50 users?'},
                response['message'],
                {'role': 'tool', 'content': json.dumps(result)},
            ],
        )
        print(follow_up['message']['content'])
```

### JavaScript Example (Ollama)

```javascript
import ollama from 'ollama';

const tools = [
  {
    type: 'function',
    function: {
      name: 'generate_forecast',
      description: 'Generate a financial forecast with given parameters',
      parameters: {
        type: 'object',
        properties: {
          startingUsers: { type: 'number', description: 'Users at month 0' },
          monthlyGrowthRate: { type: 'number', description: 'Growth % per month' },
          churnRate: { type: 'number', description: 'Churn % per month' },
          months: { type: 'number', description: 'Forecast horizon' },
          scenario: { type: 'string', description: 'base, optimistic, or pessimistic' },
        },
        required: ['startingUsers', 'monthlyGrowthRate', 'churnRate'],
      },
    },
  },
];

const response = await ollama.chat({
  model: 'llama3.1',
  messages: [{ role: 'user', content: 'Forecast 36 months with 200 starting users and 10% growth' }],
  tools,
});

// The model returns tool_calls — YOUR code decides what to do with them
if (response.message.tool_calls) {
  for (const call of response.message.tool_calls) {
    console.log(`Call: ${call.function.name}`);
    console.log(`Args: ${JSON.stringify(call.function.arguments)}`);
    // Execute your forecast logic here...
  }
}
```

### OpenAI-Compatible Endpoint

> Ollama exposes an OpenAI-compatible API at `http://localhost:11434/v1`. If you're familiar with the OpenAI SDK, you can use the same code — just change the base URL:

```python
import openai

openai.base_url = "http://localhost:11434/v1"
openai.api_key = "ollama"  # Any string works for local Ollama

response = openai.chat.completions.create(
    model="llama3.1",
    messages=messages,
    tools=tools,
)
```

### Supported Models (with Tool Calling)

| Model | Size | Best For |
|-------|------|----------|
| Llama 3.1 | 8B / 70B | Best overall tool calling support |
| Mistral Nemo | 12B | Good balance of speed and accuracy |
| Command-R+ | 104B | Best for complex multi-tool chains |
| Qwen 2.5 | 7B / 72B | Strong tool calling, multilingual |

> Run `ollama pull llama3.1` to download a model. Use the smallest model that gives good results for your use case.

---

## 8. Structured Responses

> **What are structured responses?** Normally, an AI returns free-form text. **Structured output** forces the model to return data in a specific JSON schema that you define. This is critical for the forecasting page — when the AI analyzes your financials, you want it to return structured data (numbers, arrays, objects) that your frontend can render as charts and tables, not just a wall of text.

> **Why does this matter?** If you ask the AI *"Suggest 5 cost items for a SaaS startup"*, you don't want a paragraph — you want a JSON array of cost objects that your code can directly insert into the database and display in the UI.

### How It Works

```
1. You define a JSON schema (the "shape" of the response you want)
2. You pass the schema as the "format" parameter when calling the AI
3. The AI is constrained to ONLY return valid JSON matching your schema
4. Your code parses the JSON and uses it directly — no text parsing needed
```

### Python Example — Extract Forecast Analysis

> Using Pydantic (recommended) to define the schema. Pydantic is a Python library that lets you define data models as classes, then auto-generates JSON schemas.

```python
from ollama import chat
from pydantic import BaseModel
from typing import Optional

# 1. Define the response shape
class ForecastInsight(BaseModel):
    metric: str             # e.g., "Runway", "Break-even", "Burn Rate"
    currentValue: str       # e.g., "8 months", "$4,200/mo"
    assessment: str         # "healthy", "warning", "critical"
    recommendation: str     # What to do about it

class ForecastAnalysis(BaseModel):
    summary: str                     # One-paragraph executive summary
    insights: list[ForecastInsight]  # Structured list of findings
    suggestedActions: list[str]      # Prioritized action items

# 2. Call the model with the schema
response = chat(
    model='llama3.1',
    messages=[
        {
            'role': 'user',
            'content': '''Analyze this financial forecast:
            - 100 starting users, 15% monthly growth, 5% churn
            - MRR: $8,057, Expenses: $4,200, Burn Rate: $0
            - Break-even: Month 1, Year 1 ARR: $245K
            - LTV:CAC ratio: 4.2, CAC Payback: 2.8 months
            Give me a structured analysis.'''
        }
    ],
    format=ForecastAnalysis.model_json_schema(),  # Force structured output
)

# 3. Parse — guaranteed to match the schema
analysis = ForecastAnalysis.model_validate_json(response.message.content)

# 4. Use it directly in your app
print(analysis.summary)
for insight in analysis.insights:
    print(f"  [{insight.assessment.upper()}] {insight.metric}: {insight.currentValue}")
    print(f"    → {insight.recommendation}")
```

#### Example Output

```
"Your startup shows strong unit economics with a 4.2x LTV:CAC ratio..."

  [HEALTHY] LTV:CAC Ratio: 4.2x
    → Maintain current acquisition channels; consider increasing spend
  [HEALTHY] Break-even: Month 1
    → Already profitable — rare for early-stage; reinvest excess into growth
  [WARNING] Churn Rate: 5%/month
    → 5% monthly churn means ~46% annual churn. Invest in retention features.
```

### JavaScript Example — Generate Cost Suggestions

```javascript
import ollama from 'ollama';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// 1. Define the response shape with Zod
const CostSuggestion = z.object({
  name: z.string(),
  amount: z.number(),
  frequency: z.enum(['Monthly', 'Yearly', 'One-time']),
  category: z.string(),
  reasoning: z.string(),
});

const CostSuggestions = z.object({
  suggestions: z.array(CostSuggestion),
  totalMonthlyBurn: z.number(),
});

// 2. Call the model with a structured format
const response = await ollama.chat({
  model: 'llama3.1',
  messages: [{ role: 'user', content: 'Suggest realistic operating costs for an early-stage B2B SaaS startup with 3 engineers.' }],
  format: zodToJsonSchema(CostSuggestions),
});

// 3. Parse — guaranteed valid JSON matching the schema
const result = CostSuggestions.parse(JSON.parse(response.message.content));

// 4. Insert directly into your database / display in UI
console.log(`Total monthly burn: $${result.totalMonthlyBurn}`);
result.suggestions.forEach(cost => {
  console.log(`  ${cost.name}: $${cost.amount}/${cost.frequency} (${cost.category})`);
});
```

#### Example Output

```
Total monthly burn: $28,500
  AWS Infrastructure: $800/Monthly (Infrastructure)
  Vercel Hosting: $20/Monthly (Infrastructure)
  GitHub Team: $21/Monthly (Development Tools)
  Slack Business: $37.50/Monthly (Communication)
  Engineering Salaries: $25,000/Monthly (Payroll)
  Google Workspace: $54/Monthly (Productivity)
  Legal (Incorporation): $2,500/One-time (Legal)
  D&O Insurance: $3,000/Yearly (Insurance)
```

### cURL Example — Raw API Call

> If you're building in Go or another language, you can call Ollama's REST API directly:

```bash
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1",
    "messages": [{"role": "user", "content": "Analyze: MRR $8000, expenses $12000, 100 users, 15% growth"}],
    "stream": false,
    "format": {
      "type": "object",
      "properties": {
        "summary": { "type": "string" },
        "burnRate": { "type": "number" },
        "runway": { "type": "number" },
        "isHealthy": { "type": "boolean" },
        "topRisk": { "type": "string" },
        "topAction": { "type": "string" }
      },
      "required": ["summary", "burnRate", "runway", "isHealthy", "topRisk", "topAction"]
    }
  }'
```

### Forecasting-Specific Schemas to Build

| Use Case | Schema Shape | When To Use |
|----------|-------------|-------------|
| **Forecast Analysis** | `{ summary, insights[], suggestedActions[] }` | After generating a forecast — AI explains the numbers |
| **Cost Suggestions** | `{ suggestions[{ name, amount, frequency, category }] }` | AI generates realistic expenses for the business type |
| **Revenue Stream Ideas** | `{ streams[{ name, price, frequency, rationale }] }` | AI suggests pricing tiers based on competitors |
| **Scenario Comparison** | `{ scenarios[{ name, yearOneARR, breakEven, risk }] }` | Side-by-side comparison of base/optimistic/pessimistic |
| **Funding Recommendation** | `{ shouldRaise, amount, timing, milestones[] }` | AI recommends when/how much to raise |

---

## 9. Validation Rules

> **Why validate?** Bad inputs lead to nonsensical forecasts. These rules prevent common mistakes and guide the user toward realistic assumptions.

| Rule | Description | Why |
|------|-------------|-----|
| `churnRate < growthRate` | Net growth must be positive | If more users leave than join, the business is shrinking — flag this |
| `CAC < LTV` | Unit economics must work | Spending more to acquire a customer than they'll ever pay you is unsustainable |
| `revenueStreams.length ≥ 1` | At least one stream required | Can't forecast revenue without knowing what you charge |
| `startingUsers > 0` | Cannot forecast from zero | The math produces `0 × anything = 0` forever |
| `growthRate > 0 && ≤ 100` | Sanity bound | > 100% monthly growth is near-impossible to sustain |
| `TAM ≥ SAM ≥ SOM` | Market hierarchy | These must nest (TAM is always the largest) — see Section 3 Market Ceiling |

---

## 10. Suggested Tech Stack

> Pick whatever you're comfortable with. Here are proven options:

| Layer | Options |
|-------|---------|
| **Frontend** | React, Vue, Svelte, Angular |
| **Charts** | Recharts, Chart.js, D3.js, ApexCharts |
| **Backend** | Go (Gin/Fiber), Python (FastAPI/Flask), Node.js (Express), Rust (Actix) |
| **Database** | PostgreSQL, MySQL, MongoDB, SQLite |
| **AI Chat** | OpenAI API, Google Gemini API, Ollama (self-hosted) |
| **Structured Output** | Pydantic (Python), Zod (JavaScript), JSON Schema (any language) |
| **Auth** | WorkOS, Auth0, Clerk, Supabase Auth |

---

## References

- [Ollama Tool Support (Function Calling)](https://ollama.com/blog/tool-support)
- [Ollama Structured Outputs](https://ollama.com/blog/structured-outputs)
- [Ollama Python Library — Tool Examples](https://github.com/ollama/ollama-python/blob/main/examples/tools.py)
- [Ollama JavaScript Library — Tool Examples](https://github.com/ollama/ollama-js/blob/main/examples/tools/calculator.ts)
- [Models with Tool Support](https://ollama.com/search?c=tools)
