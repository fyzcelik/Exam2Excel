import { GoogleGenAI, Type } from "@google/genai";
import { ExamQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function processExamPdf(file: File): Promise<ExamQuestion[]> {
  const base64Data = await fileToBase64(file);

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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
You are an exam parser and solver.

STEP 1
Extract every question and options A, B, C, D, E from the PDF.

CRITICAL: Question Numbering
- Questions may NOT start from 1 (e.g., they might start from 8, 15, etc.).
- Questions may NOT be sequential (e.g., 8, 9, 11, 15).
- Some questions might be skipped or missing in the document.
- ALWAYS use the ACTUAL question number/ID as written in the PDF for the "Soru ID" field.
- Do NOT re-index the questions. If the PDF says "Question 8", the Soru ID must be "8".

STEP 2
Check if the correct answer is already shown in the PDF:
Examples:
Answer: B
Correct answer: C
Doğru cevap: A
ANSWER KEY sections
Highlighted / marked answers

If the answer exists in the document, use it.

STEP 3
If the answer does NOT exist, solve the question yourself and determine the most likely correct option.

Rules
- "Doğru Cevap" must contain only: A, B, C, D or E
- Do not leave it empty unless impossible
- Do not write explanations
- Output must be valid JSON

Keys must be exactly:
"Soru ID", "Soru", "A", "B", "C", "D", "E", "Doğru Cevap"
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
