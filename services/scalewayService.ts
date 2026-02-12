import { DocumentFile, ExtractionCell, Column, ExtractionResult } from "../types";

const apiKey = import.meta.env.VITE_SCALEWAY_API_KEY;
if (!apiKey) {
  console.warn("VITE_SCALEWAY_API_KEY is not set — Scaleway models will not work");
}

// Supports both project-scoped URLs and the generic endpoint
const SCALEWAY_URL = import.meta.env.VITE_SCALEWAY_BASE_URL || "https://api.scaleway.ai/v1";
const CHAT_URL = `${SCALEWAY_URL.replace(/\/+$/, '')}/chat/completions`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(operation: () => Promise<T>, retries = 5, initialDelay = 1000): Promise<T> {
  let currentTry = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      currentTry++;
      const isRateLimit =
        error?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('rate');

      if (isRateLimit && currentTry <= retries) {
        const delay = initialDelay * Math.pow(2, currentTry - 1) + (Math.random() * 1000);
        console.warn(`Scaleway Rate Limit hit. Retrying attempt ${currentTry} in ${delay.toFixed(0)}ms...`);
        await wait(delay);
        continue;
      }
      throw error;
    }
  }
}

function stripThinkingTokens(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

async function chatCompletion(
  messages: { role: string; content: string }[],
  modelId: string,
  jsonMode: boolean = false
): Promise<string> {
  const body: any = {
    model: modelId,
    messages,
    temperature: 0.15,
    max_tokens: 4096,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Scaleway API error ${response.status}:`, errorBody);
    const err: any = new Error(`Scaleway API error: ${response.status} - ${errorBody}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  return stripThinkingTokens(content);
}

export const extractColumnData = async (
  doc: DocumentFile,
  column: Column,
  modelId: string
): Promise<ExtractionCell> => {
  return withRetry(async () => {
    let docText = "";
    try {
      docText = decodeURIComponent(escape(atob(doc.content)));
    } catch {
      docText = atob(doc.content);
    }

    let formatInstruction = "";
    switch (column.type) {
      case 'date':
        formatInstruction = "Format the date as YYYY-MM-DD.";
        break;
      case 'boolean':
        formatInstruction = "Return 'true' or 'false' as the value string.";
        break;
      case 'number':
        formatInstruction = "Return a clean number string, removing currency symbols if needed.";
        break;
      case 'list':
        formatInstruction = "Return the items as a comma-separated string.";
        break;
      default:
        formatInstruction = "Keep the text concise.";
    }

    const systemPrompt = `You are a precise data extraction agent. You must extract data exactly as requested.
You MUST respond with valid JSON matching this exact schema:
{
  "value": "string - The extracted answer, concise",
  "confidence": "string - one of: High, Medium, Low",
  "quote": "string - Verbatim text from the document supporting the answer, must be exact substring",
  "page": "number - The page number where the information was found",
  "reasoning": "string - A short explanation of why this value was selected"
}
Do not include any text outside the JSON object.`;

    const userPrompt = `DOCUMENT CONTENT:
${docText}

Task: Extract specific information from the provided document.

Column Name: "${column.name}"
Extraction Instruction: ${column.prompt}

Format Requirements:
- ${formatInstruction}
- Provide a confidence score (High/Medium/Low).
- Include the exact quote from the text where the answer is found.
- Provide a brief reasoning.`;

    const responseText = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      modelId,
      true
    );

    if (!responseText) {
      throw new Error("Empty response from model");
    }

    const json = JSON.parse(responseText);

    return {
      value: String(json.value || ""),
      confidence: (json.confidence as any) || "Low",
      quote: json.quote || "",
      page: json.page || 1,
      reasoning: json.reasoning || "",
      status: 'needs_review'
    };
  });
};

export const generatePromptHelper = async (
  name: string,
  type: string,
  currentPrompt: string | undefined,
  modelId: string
): Promise<string> => {
  const userPrompt = `I need to configure a Large Language Model to extract a specific data field from business documents.

Field Name: "${name}"
Field Type: "${type}"
${currentPrompt ? `Draft Prompt: "${currentPrompt}"` : ""}

Please write a clear, effective prompt that I can send to the LLM to get the best extraction results for this field.
The prompt should describe what to look for and how to handle edge cases if applicable.
Return ONLY the prompt text, no conversational filler.`;

  try {
    const responseText = await chatCompletion(
      [{ role: "user", content: userPrompt }],
      modelId
    );
    return responseText.trim() || "";
  } catch (error) {
    console.error("Prompt generation error:", error);
    return currentPrompt || `Extract the ${name} from the document.`;
  }
};

export const analyzeDataWithChat = async (
  message: string,
  context: { documents: DocumentFile[]; columns: Column[]; results: ExtractionResult },
  history: any[],
  modelId: string
): Promise<string> => {
  let dataContext = "CURRENT EXTRACTION DATA:\n";
  dataContext += `Documents: ${context.documents.map(d => d.name).join(", ")}\n`;
  dataContext += `Columns: ${context.columns.map(c => c.name).join(", ")}\n\n`;
  dataContext += "DATA TABLE (CSV Format):\n";

  const headers = ["Document Name", ...context.columns.map(c => c.name)].join(",");
  dataContext += headers + "\n";

  context.documents.forEach(doc => {
    const row = [doc.name];
    context.columns.forEach(col => {
      const cell = context.results[doc.id]?.[col.id];
      const val = cell ? cell.value.replace(/,/g, ' ') : "N/A";
      row.push(val);
    });
    dataContext += row.join(",") + "\n";
  });

  const systemPrompt = `You are an intelligent data analyst assistant.
You have access to a dataset extracted from documents (provided in context).

${dataContext}

Instructions:
1. Answer the user's question based strictly on the provided data table.
2. If comparing documents, mention them by name.
3. If the data is missing or N/A, state that clearly.
4. Keep answers professional and concise.`;

  const openAIHistory = history.map((msg: any) => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.parts?.[0]?.text || msg.content || "",
  }));

  const messages = [
    { role: "system", content: systemPrompt },
    ...openAIHistory,
    { role: "user", content: message },
  ];

  try {
    return await chatCompletion(messages, modelId);
  } catch (error) {
    console.error("Chat analysis error:", error);
    return "I apologize, but I encountered an error while analyzing the data. Please try again.";
  }
};
