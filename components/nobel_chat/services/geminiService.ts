
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { PageType } from "../../../types";

// SA-001: API key must be passed by callers (server-side only), never read from client bundle.

const tableFunctionDeclaration: FunctionDeclaration = {
  name: 'renderTable',
  parameters: {
    type: Type.OBJECT,
    description: 'Renders a styled table with data.',
    properties: {
      columns: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Column names for the table'
      },
      rows: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          description: 'Object representing a row with column keys'
        }
      }
    },
    required: ['columns', 'rows'],
  },
};

const chartFunctionDeclaration: FunctionDeclaration = {
  name: 'renderChart',
  parameters: {
    type: Type.OBJECT,
    description: 'Renders an interactive business chart.',
    properties: {
      type: {
        type: Type.STRING,
        description: 'Type of chart: bar, line, or pie'
      },
      data: {
        type: Type.ARRAY,
        items: { type: Type.OBJECT },
        description: 'Data points for the chart'
      },
      title: { type: Type.STRING },
      xAxis: { type: Type.STRING },
      yAxis: { type: Type.STRING }
    },
    required: ['type', 'data', 'title'],
  },
};

const pitchDeckFunctionDeclaration: FunctionDeclaration = {
  name: 'renderPitchDeck',
  parameters: {
    type: Type.OBJECT,
    description: 'Renders a slide-based pitch deck.',
    properties: {
      slides: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            points: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['title', 'content']
        }
      }
    },
    required: ['slides'],
  },
};

const imageGenFunctionDeclaration: FunctionDeclaration = {
  name: 'generateImage',
  parameters: {
    type: Type.OBJECT,
    description: 'Generates an image or logo based on a prompt.',
    properties: {
      prompt: { type: Type.STRING, description: 'Detailed visual description' },
      isLogo: { type: Type.BOOLEAN, description: 'Whether the image is a logo design' }
    },
    required: ['prompt'],
  },
};

export const chatWithGeminiStream = async (
  message: string,
  pageContext: PageType,
  history: { role: 'user' | 'model', parts: { text: string }[] }[] = [],
  apiKey?: string
) => {
  const key = apiKey || "";
  if (!key) throw new Error("API key is required — call through a server action.");
  const ai = new GoogleGenAI({ apiKey: key });

  const systemInstruction = `You are a world-class business consultant specialized in ${pageContext}. 
  You have access to Google Search. When the user asks for current news, market data, or facts, use Google Search.
  You can render interactive tables, charts, and pitch decks using tools.
  Always explain your reasoning in Markdown.
  When providing answers based on web search, indicate your confidence level in the accuracy of the information provided (e.g. "Accuracy Score: 95%").`;

  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: [
      ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: h.parts })),
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction,
      tools: [
        { googleSearch: {} },
        {
          functionDeclarations: [
            tableFunctionDeclaration,
            chartFunctionDeclaration,
            pitchDeckFunctionDeclaration,
            imageGenFunctionDeclaration
          ]
        }
      ]
    }
  });

  return responseStream;
};

export const generateImageContent = async (prompt: string, apiKey?: string) => {
  const key = apiKey || "";
  if (!key) throw new Error("API key is required — call through a server action.");
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }]
    }
  });

  let imageUrl = '';
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }
  return imageUrl;
};
