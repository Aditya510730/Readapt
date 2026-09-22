import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
console.log("GEMINI_API_KEY length:", process.env.GEMINI_API_KEY?.length || 0);

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.post("/simplify", async (req, res) => {
  try {
    const { sentence } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Simplify the following sentence for a struggling reader.

Rules:
- Keep the exact meaning.
- Do not remove important information.
- Do not add new information.
- Use simpler vocabulary and clearer grammar.
- Return only the simplified sentence.

Sentence:
${sentence}`,
    });

    res.json({
      simplified: response.text.trim(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to simplify sentence",
    });
  }
});

app.listen(3001, () => {
  console.log("LLM server running on http://localhost:3001");
});
