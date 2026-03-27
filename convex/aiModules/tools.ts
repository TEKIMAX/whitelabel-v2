
export const tableTool = {
    type: "function",
    function: {
        name: 'renderTable',
        description: 'Renders a styled table with data.',
        parameters: {
            type: "object",
            properties: {
                columns: {
                    type: "array",
                    items: { type: "string" },
                    description: 'Column names for the table'
                },
                rows: {
                    type: "array",
                    items: {
                        type: "object",
                        description: 'Object representing a row with column keys'
                    }
                }
            },
            required: ['columns', 'rows'],
        },
    }
};

export const chartTool = {
    type: "function",
    function: {
        name: 'renderChart',
        description: 'Renders an interactive business chart.',
        parameters: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    description: 'Type of chart: bar, line, or pie'
                },
                data: {
                    type: "array",
                    items: { type: "object" },
                    description: 'Data points for the chart'
                },
                title: { type: "string" },
                xAxis: { type: "string" },
                yAxis: { type: "string" }
            },
            required: ['type', 'data', 'title'],
        },
    }
};

export const pitchDeckTool = {
    type: "function",
    function: {
        name: 'renderPitchDeck',
        description: 'Renders a slide-based pitch deck.',
        parameters: {
            type: "object",
            properties: {
                slides: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            content: { type: "string" },
                            points: { type: "array", items: { type: "string" } }
                        },
                        required: ['title', 'content']
                    }
                }
            },
            required: ['slides'],
        },
    }
};

export const imageGenTool = {
    type: "function",
    function: {
        name: 'generateImage',
        description: 'Generates an image or logo based on a prompt.',
        parameters: {
            type: "object",
            properties: {
                prompt: { type: "string", description: 'Detailed visual description' },
                isLogo: { type: "boolean", description: 'Whether the image is a logo design' }
            },
            required: ['prompt'],
        },
    }
};

export const modelCanvasTool = {
    type: "function",
    function: {
        name: 'renderModelCanvas',
        description: 'Updates a section of the Lean Business Model Canvas with AI-generated strategies.',
        parameters: {
            type: "object",
            properties: {
                section: {
                    type: "string",
                    description: 'The canvas section to update (e.g., Problem, Solution, Unique Value Proposition, Customer Segments, Key Metrics, Channels, Cost Structure, Revenue Streams, Unfair Advantage)'
                },
                content: {
                    type: "string",
                    description: 'The strategy content in Markdown format'
                }
            },
            required: ['section', 'content'],
        },
    }
};

export const startupJourneyTool = {
    type: "function",
    function: {
        name: 'updateStartupJourney',
        description: 'Drafts a new milestone for the Startup Journey timeline.',
        parameters: {
            type: "object",
            properties: {
                title: { type: "string", description: 'Short title of the milestone (e.g. "Series A Funding", "First 100 Users")' },
                date: { type: "string", description: 'Date of the event in YYYY-MM-DD format' },
                type: { type: "string", description: 'Type of milestone: Launch, Funding, Pivot, Metric, Hiring, Product, Other' },
                description: { type: "string", description: '1-2 sentence description of what happened.' },
                tractionType: { type: "string", description: 'Status/Color: "Traction" (Green/Good), "Pivot" (Red/Bad/Change), "No Traction" (Neutral/Gray). Default to No Traction.' },
                isFeatured: { type: "boolean", description: 'Whether this is a major "Star" event to feature' }
            },
            required: ['title', 'date', 'type', 'description']
        }
    }
};

export const customerCardsTool = {
    type: "function",
    function: {
        name: 'renderCustomerCards',
        description: 'Renders a list of customer profiles or interview subjects as interactive cards.',
        parameters: {
            type: "object",
            properties: {
                customers: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            role: { type: "string" },
                            status: { type: "string", description: "Interview status e.g., 'Interviewed', 'Scheduled', 'No Traction', 'Potential Fit', 'Not Yet Closed'" },
                            willingnessToPay: { type: "string", description: "Price point or 'No'" },
                            notes: { type: "string" },
                            videoUrl: { type: "string", description: "Optional URL to interview recording" },
                            tags: { type: "array", items: { type: "string" } }
                        },
                        required: ['name', 'role', 'status']
                    }
                }
            },
            required: ['customers']
        }
    }
};

export const financialSnapshotTool = {
    type: "function",
    function: {
        name: 'renderFinancialSnapshot',
        description: 'Renders a financial grid showing Unit Economics (CAC, LTV, ARPU) and a mini P&L summary.',
        parameters: {
            type: "object",
            properties: {
                cac: { type: "number", description: "Customer Acquisition Cost" },
                ltv: { type: "number", description: "Lifetime Value" },
                arpu: { type: "number", description: "Average Revenue Per User" },
                revenue: { type: "string", description: "Projected Annual Revenue (e.g. '$1.2M')" },
                burnRate: { type: "string", description: "Monthly Burn Rate (e.g. '$50k')" },
                margin: { type: "string", description: "Groos Margin % (e.g. '75%')" }
            },
            required: ['cac', 'ltv', 'arpu', 'revenue', 'margin']
        }
    }
};

export const swotAnalysisTool = {
    type: "function",
    function: {
        name: 'renderSWOTAnalysis',
        description: 'Renders a 2x2 SWOT grid (Strengths, Weaknesses, Opportunities, Threats) for comparing competitors.',
        parameters: {
            type: "object",
            properties: {
                strengths: { type: "array", items: { type: "string" }, description: "Internal positive factors" },
                weaknesses: { type: "array", items: { type: "string" }, description: "Internal negative factors" },
                opportunities: { type: "array", items: { type: "string" }, description: "External positive factors" },
                threats: { type: "array", items: { type: "string" }, description: "External negative factors" },
                competitorName: { type: "string", description: "Name of the entity being analyzed" }
            },
            required: ['strengths', 'weaknesses', 'opportunities', 'threats']
        }
    }
};

// --- TOOL DEFINITIONS ---

// 1. UI Specialist Tools (Hidden from Main Model)
export const actionCardTool = {
    type: "function",
    function: {
        name: 'renderActionCard',
        description: 'Renders a call-to-action card when data is missing, prompting the user to navigate to a specific page to add it.',
        parameters: {
            type: "object",
            properties: {
                title: { type: "string", description: "Title of the action e.g., 'No Customers Found'" },
                description: { type: "string", description: "Explanation and instruction e.g., 'You haven't added any customer interviews yet. Go to the Customers page to log your first interview.'" },
                buttonLabel: { type: "string", description: "Label for the button e.g., 'Go to Customers'" },
                navigationTarget: { type: "string", description: "The page identifier to navigate to e.g., 'CUSTOMERS', 'MODEL_CANVAS', 'REVENUE'" },
                type: { type: "string", description: "Type of action card e.g. 'warning', 'info', 'success', 'error'" }, // Added type
                data: { type: "object", description: "Any additional data to pass to the card" } // Added data
            },
            required: ['title', 'description', 'buttonLabel', 'navigationTarget']
        }
    }
};

export const recommendationTool = {
    type: "function",
    function: {
        name: 'renderRecommendation',
        description: 'Renders a styled recommendation or strategic insight card. Use this for advice, warnings, audits, or strategic shifts, especially when "foundational data" is missing or a "pivot" is suggested.',
        parameters: {
            type: "object",
            properties: {
                title: { type: "string", description: "Title of the recommendation" },
                content: { type: "string", description: "Detailed explanation in Markdown" },
                type: { type: "string", description: "'insight', 'warning', 'audit', 'success'" },
                priority: { type: "string", description: "'high', 'medium', 'low'" }
            },
            required: ['title', 'content', 'type']
        }
    }
};

export const executionAuditTool = {
    type: "function",
    function: {
        name: 'renderExecutionAudit',
        description: 'Renders a high-level Strategic Audit when MULTIPLE foundational data points are missing. Use this before suggesting specific actions.',
        parameters: {
            type: "object",
            properties: {
                status: { type: "string", description: "Current high-level state e.g., 'Data Deficient', 'Needs Validation', 'Strategic Drift Detected'" },
                missingDataPoints: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            category: { type: "string", description: "e.g. Market Research, Financial Model, Customer Discovery" },
                            details: { type: "string", description: "Specific missing data or red flags detected." }
                        }
                    }
                },
                executiveSummary: { type: "string", description: "A punchy, one-line executive takeaway for the founder." }
            },
            required: ['status', 'missingDataPoints', 'executiveSummary']
        }
    }
};

export const expenseAnalysisTool = {
    type: "function",
    function: {
        name: 'renderExpenseAnalysis',
        description: 'Renders a detailed expense breakdown including monthly burn, top expenses, and category distribution.',
        parameters: {
            type: "object",
            properties: {
                totalMonthly: { type: "number", description: "Total monthly recurring expenses" },
                totalOneTime: { type: "number", description: "Total one-time (startup) costs" },
                categories: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            amount: { type: "number" },
                            percentage: { type: "number" }
                        },
                        required: ['name', 'amount', 'percentage']
                    }
                },
                topExpenses: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            amount: { type: "number" }
                        },
                        required: ['name', 'amount']
                    }
                },
                summary: { type: "string", description: "Analyst insight or summary of the financial health" }
            },
            required: ['totalMonthly', 'totalOneTime', 'categories', 'topExpenses', 'summary']
        }
    }
};

export const UI_TOOLS = [
    // ── UI Rendering Tools ──
    tableTool,
    chartTool,
    pitchDeckTool,
    imageGenTool,
    modelCanvasTool,
    startupJourneyTool,
    customerCardsTool,
    financialSnapshotTool,
    expenseAnalysisTool,
    swotAnalysisTool,
    executionAuditTool,
    actionCardTool,
    recommendationTool
];

// Router Tool (OpenAI Format - for Ollama)
// Note: If sending to Rust Worker which has internal mapping, avoid using this for Gemini models routed via Ollama if the worker handles mapping.
// But keeping it for direct OpenAI compatibility.
export const ROUTER_TOOL = UI_TOOLS;

// Gemini Tools (Google Format)
export const geminiTools = [{
    function_declarations: UI_TOOLS.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters
    }))
}];
