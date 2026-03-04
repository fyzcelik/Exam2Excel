import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { ExamQuestion } from "../types";

// v1 sürümünü zorlayarak 404 hatalarının önüne geçiyoruz
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

export async function processExamPdf(file: File): Promise<ExamQuestion[]> {
  const base64Data = await fileToBase64(file);

  // Model tanımını yaparken apiVersion: 'v1' eklemek 404 sorununu çözer
  const model = genAI.getGenerativeModel(
    { model: "gemini-1.5-flash" }, // Flash model PDF analizi için en iyisidir
    { apiVersion: "v1" } 
  );

  const generationConfig = {
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
  };

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
          {
            text: `You are an exam parser and solver. 
            Extract every question and options A, B, C, D, E from the PDF.
            Use ACTUAL question number as "Soru ID".
            Solve if answer is missing. 
            "Doğru Cevap" must be only A, B, C, D or E.`.trim(),
          },
        ],
      },
    ],
    generationConfig,
  });

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
