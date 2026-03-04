import { GoogleGenerativeAI } from "@google/generative-ai";
import { ExamQuestion } from "../types";

// API anahtarını Vite standartlarında çekiyoruz
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

export async function processExamPdf(file: File): Promise<ExamQuestion[]> {
  const base64Data = await fileToBase64(file);

  // v1 sürümünü kullanarak 404 hatalarının önüne geçiyoruz
  const model = genAI.getGenerativeModel(
    { model: "gemini-1.5-flash" },
    { apiVersion: "v1" }
  );

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
            text: `You are an exam parser. 
            Extract every question and options A, B, C, D, E from the PDF.
            Use ACTUAL question number as "Soru ID".
            Return ONLY a raw JSON array of objects. 
            Each object must strictly have these keys: "Soru ID", "Soru", "A", "B", "C", "D", "E", "Doğru Cevap".
            Do not include any explanations or markdown formatting like \`\`\`json.`.trim(),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1, // Daha tutarlı sonuçlar için
    },
  });

  const response = await result.response;
  let text = response.text();
  
  // Güvenlik Önlemi: AI bazen JSON'ı markdown bloğu içinde gönderir, onu temizliyoruz.
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parse Hatası. Gelen ham metin:", text);
    throw new Error("AI cevabı beklenen JSON formatında değil.");
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
