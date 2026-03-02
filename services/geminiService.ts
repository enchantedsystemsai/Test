import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async summarizeNote(content: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [{
          text: "Give me a friendly 'Quick Catchup' summary. Start with one sentence, then 3 bullet points, then a 'Bottom Line' section.\n\n" + content
        }]
      }],
      config: {
        systemInstruction: "You are a helpful note-taking assistant. Provide concise and useful summaries."
      }
    });
    return response.text || "";
  },

  async getNextSteps(content: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{
        parts: [{
          text: "Extract 3–5 simple next steps from this note. Start each with a verb.\n\n" + content
        }]
      }]
    });
    return response.text || "";
  },

  async getCounterPerspective(content: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{
        parts: [{
          text: "Act like a supportive mentor. Give 2 gentle alternative perspectives or potential blind spots for this note.\n\n" + content
        }]
      }]
    });
    return response.text || "";
  },

  async rewriteProfessional(content: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [{
          text: "Rewrite this text so it sounds professional but still natural. Keep the user's intended tone.\n\n" + content
        }]
      }]
    });
    return response.text || "";
  },

  async generateTitle(content: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [{
          text: "Give me a short, natural 3‑word title for this note. Do not use quotes or special characters.\n\n" + content
        }]
      }]
    });
    return response.text?.trim() || "New Note";
  },

  async extractTasks(content: string): Promise<Task[]> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{
        parts: [{
          text: "Extract tasks from this text.\n\n" + content
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: {
                type: Type.STRING,
                description: "Description of the task"
              },
              deadline: {
                type: Type.STRING,
                description: "Optional deadline or date mentioned"
              }
            },
            required: ["description"],
            propertyOrdering: ["description", "deadline"]
          }
        }
      }
    });

    try {
      const parsed = JSON.parse(response.text || "[]");
      return parsed.map((t: any) => ({
        id: Math.random().toString(36).slice(2),
        description: t.description,
        deadline: t.deadline || undefined,
        completed: false,
      }));
    } catch {
      return [];
    }
  },

  async suggestTags(content: string): Promise<string[]> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [{
          text: "Suggest 2 simple categorisation tags for this note.\n\n" + content
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch {
      return [];
    }
  },

  async performOCR(base64Image: string, mimeType = "image/jpeg"): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: "Transcribe all text in this image exactly. If no text exists, briefly describe the image content." }
        ]
      }]
    });
    return response.text || "";
  },

  async transcribeAudio(base64Audio: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [
          { inlineData: { data: base64Audio, mimeType: "audio/webm" } },
          { text: "Transcribe this audio recording accurately. Keep the speaker's tone but remove filler words (ums, ahs)." }
        ]
      }]
    });
    return response.text || "";
  },
};
