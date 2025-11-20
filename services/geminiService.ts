import { GoogleGenAI, Type } from "@google/genai";
import { Subtitle } from "../types";

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateSubtitles = async (videoFile: File): Promise<Subtitle[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prepare the file part
  const videoPart = await fileToGenerativePart(videoFile);

  // Prompt engineering
  const prompt = `
    Analyze the audio in this video file and generate precise subtitles suitable for social media "karaoke" style.
    
    Crucial Instructions:
    1. Break the subtitles into SINGLE WORD segments (1 word ideal, max 2 words).
    2. Timestamps must be EXACT and aligned perfectly with the start and end of the spoken words.
    3. Return the result strictly as a JSON object containing a list of subtitles.
    4. Each subtitle must have a 'startTime' (format MM:SS.mmm), 'endTime' (format MM:SS.mmm), and 'text'.
    5. Ensure timestamps use DOTS for milliseconds (e.g. 00:00:01.500) NOT commas.
    6. Ensure timestamps are sequential and do not overlap illogically.
    7. If there is no speech, return an empty list.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [
          videoPart,
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtitles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  startTime: { type: Type.STRING, description: "Start time in MM:SS.mmm format" },
                  endTime: { type: Type.STRING, description: "End time in MM:SS.mmm format" },
                  text: { type: Type.STRING, description: "The spoken text (1 word)" },
                },
                required: ["startTime", "endTime", "text"]
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const result = JSON.parse(jsonText);
    
    // Add unique IDs
    const subtitlesWithIds = (result.subtitles || []).map((sub: any) => ({
      ...sub,
      id: crypto.randomUUID()
    }));

    return subtitlesWithIds;

  } catch (error) {
    console.error("Error generating subtitles:", error);
    throw error;
  }
};