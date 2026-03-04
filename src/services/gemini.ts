import { GoogleGenerativeAI } from "@google/generative-ai";
import { ExamQuestion } from "../types";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

export async function processExamPdf(file: File): Promise<ExamQuestion[]> {
  const base64Data = await fileToBase64(file);

  // ÇÖZÜM: Model isminin başına "models/" ekliyoruz ve apiVersion belirtmiyoruz (varsayılanı kullansın)
  const model = genAI.getGenerativeModel({ 
    model: "models/gemini-1.5-flash" 
  });

  const result = await model.generateContent([
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
      Return ONLY a raw JSON array. 
      Format: [{"Soru ID": "...", "Soru": "...", "A": "...", "B": "...", "C": "...", "D": "...", "E": "...", "Doğru Cevap": "..."}]
      No markdown, no explanations.`.trim(),
    },
  ]);

  const response = await result.response;
  let text = response.text();
  
  // Markdown temizliği
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();
  
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
