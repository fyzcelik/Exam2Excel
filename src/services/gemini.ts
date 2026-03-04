import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { ExamQuestion } from "../types";

// Vite projelerinde çevre değişkenlerini import.meta.env üzerinden okumak en garantisidir
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

export async function processExamPdf(file: File): Promise<ExamQuestion[]> {
  const base64Data = await fileToBase64(file);

  // Model ismini güncel ve kararlı bir sürüme çekiyoruz
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            "Soru ID": { type: SchemaType.STRING },
            "Soru": { type: SchemaType.STRING },
            "A": { type: SchemaType.STRING },
            "B": { type: SchemaType.STRING },
            "C": { type: SchemaType.STRING },
            "D": { type: SchemaType.STRING },
            "E": { type: SchemaType.STRING },
            "Doğru Cevap": { type: SchemaType.STRING },
          },
          required: ["Soru ID", "Soru", "A", "B", "C", "D", "E", "Doğru Cevap"],
        },
      },
    },
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: file.type,
        data: base64Data,
      },
    },
    {
      text: `You are an exam parser and solver.
      STEP 1: Extract every question and options A, B, C, D, E from the PDF.
      STEP 2: Use the ACTUAL question number/ID as "Soru ID".
      STEP 3: Solve the question if the answer isn't in the PDF.
      Rules: "Doğru Cevap" must be A, B, C, D or E.`.trim(),
    },
  ]);

  const response = await result.response;
  const text = response.text();
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parse Hatası:", text);
    throw new Error("AI cevabı beklenen formatta değil.");
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
