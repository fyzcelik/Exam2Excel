import { GoogleGenAI, Type } from "@google/genai";
import { ExamQuestion } from "../types";

const ai = new GoogleGenAI({ 
  apiKey: (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || "" 
});

export async function processExamPdf(file: File): Promise<ExamQuestion[]> {
  const base64Data = await fileToBase64(file);

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
          {
            text: `
You are an expert exam parser and mathematician.

STEP 1: Extraction
Extract every question and options A, B, C, D, E from the PDF.

CRITICAL: Mathematical Expressions
- Use clean, human-readable notation for Excel.
- Exponents: Use "^" (e.g., x^2, 42(64)^x).
- Fractions: Use "/" (e.g., 24/13).
- Symbols: Use standard Unicode symbols directly: √ (square root), ∫ (integral), ±, ∞, π, θ, ∑ (summation), Δ.
- WARNING: Do NOT confuse √ (square root) with ∑ (summation). If you see a root, use √.
- For complex formulas, use parentheses: (x+1)/(y-2).
- Do NOT use LaTeX backslash commands (like \\frac).
- Do NOT use dollar signs ($).

CRITICAL: Options & Distractors
- Every question MUST have at least 4 options (A, B, C, D).
- If the PDF provides 4 or more options, use them as they are.
- If the PDF provides fewer than 4 options (e.g., only the correct answer is given), you MUST generate plausible, mathematically-related distractors to fill up to at least 4 options (A, B, C, D).
- Option E should be included in the JSON; if it does not exist in the PDF and you have already provided 4 options, set "E" to an empty string "".
- Ensure the distractors are realistic and follow the same format as the correct answer.

CRITICAL: Question Numbering
- Use the ACTUAL question number/ID as written in the PDF. Do not re-index.

STEP 2: Answer Verification & Solving
- First, look for the answer key or marked answers in the PDF.
- SECOND, solve the question yourself to verify the answer. If the PDF's answer is missing or clearly wrong, use your calculated correct answer.
- Double-check coordinate geometry, algebra, and calculus logic.

Rules
- "Doğru Cevap" must be exactly one of: A, B, C, D, E.
- Output must be valid JSON.
- Keys: "Soru ID", "Soru", "A", "B", "C", "D", "E", "Doğru Cevap".
`.trim(),
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            "Soru ID": { type: Type.STRING, description: "The actual question number or ID as written in the PDF (e.g., '8', '15'). Do not re-index." },
            "Soru": { type: Type.STRING, description: "The full text of the question" },
            "A": { type: Type.STRING, description: "Option A text" },
            "B": { type: Type.STRING, description: "Option B text" },
            "C": { type: Type.STRING, description: "Option C text" },
            "D": { type: Type.STRING, description: "Option D text" },
            "E": { type: Type.STRING, description: "Option E text" },
            "Doğru Cevap": { type: Type.STRING, description: "The correct option (A, B, C, D, or E). Leave empty if unknown." },
          },
          required: ["Soru ID", "Soru", "A", "B", "C", "D", "E", "Doğru Cevap"],
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response:", text);
    throw new Error("Invalid response format from AI");
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
}
