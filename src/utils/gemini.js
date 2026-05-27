import { GoogleGenerativeAI } from "@google/generative-ai";
import Note from "../models/Note.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const toneInstructions = {
  simple:
    "Explain in simple, easy to understand language suitable for any student.",
  detailed:
    "Provide a thorough and detailed explanation covering all key points in depth.",
  eli5: "Explain this like I am 5 years old. Use very simple words, analogies and examples.",
  academic:
    "Explain in a formal academic tone with proper terminology and structure.",
  bullet:
    "Explain using clear bullet points and short sentences. Be concise and organized.",
};

const getNoteContent = async (note) => {
  // For text, docx, pptx, txt — content is already extracted
  if (note.content) {
    return { type: "text", data: note.content };
  }

  // For PDFs and images — send the file URL to Gemini
  if (note.fileUrl) {
    return { type: "url", data: note.fileUrl };
  }

  throw new Error("Note has no content or file URL");
};

const buildGeminiParts = async (note, promptText) => {
  const noteContent = await getNoteContent(note);

  if (noteContent.type === "text") {
    return [{ text: `${promptText}\n\nNote Content:\n${noteContent.data}` }];
  }

  // For PDF/image files fetch as base64 for Gemini
  if (noteContent.type === "url") {
    const response = await fetch(noteContent.data);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = note.type === "pdf" ? "application/pdf" : "image/jpeg";

    return [
      { text: promptText },
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ];
  }
};

export const explainNotePrompt = async (note, tone) => {
  const toneText = toneInstructions[tone] || toneInstructions.simple;
  const promptText = `You are an expert study assistant. ${toneText} 
  Explain the following study note clearly and thoroughly. 
  Structure your explanation with a brief overview first, then go through the key concepts.`;

  const parts = await buildGeminiParts(note, promptText);
  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  });
  return result.response.text();
};

export const generateQuizPrompt = async (
  note,
  count,
  existingQuestions = [],
) => {
  const exclusionBlock =
    existingQuestions.length > 0
      ? `\n\nDo NOT repeat or rephrase any of these existing questions:\n${existingQuestions.map((q, i) => `${i + 1}. ${q.question}`).join("\n")}`
      : "";

  const promptText = `You are an expert study assistant. Generate exactly ${count} multiple choice questions based on the following study note.${exclusionBlock}

Return ONLY a valid JSON array with no extra text, markdown, or code blocks. Use this exact format:
[
  {
    "question": "Question text here",
    "options": ["A. option one", "B. option two", "C. option three", "D. option four"],
    "answer": "A. option one",
    "explanation": "Brief explanation of why this is correct"
  }
]`;

  const parts = await buildGeminiParts(note, promptText);
  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  });
  const text = result.response.text();

  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
};

export const generateFlashcardsPrompt = async (note) => {
  const promptText = `You are an expert study assistant. Generate flashcards from the following study note.

Return ONLY a valid JSON array with no extra text, markdown, or code blocks. Use this exact format:
[
  {
    "term": "Key term or concept",
    "definition": "Clear concise definition or explanation"
  }
]`;

  const parts = await buildGeminiParts(note, promptText);
  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  });
  const text = result.response.text();

  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
};

export const explainFailedTopicsPrompt = async (note, failedTopics) => {
  const topicsList = failedTopics.join("\n- ");
  const promptText = `You are an expert study assistant. A student just completed a quiz on their study note and struggled with the following topics:

- ${topicsList}

Based on the study note provided, give a clear and focused explanation of only these topics the student got wrong. 
Be encouraging in tone. Start with "Let's go over the areas you need to review:" and address each topic directly.`;

  const parts = await buildGeminiParts(note, promptText);
  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  });
  return result.response.text();
};
export const processNoteInBackground = async (noteId) => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const isQuotaError = (err) =>
    err.message?.includes("429") ||
    err.message?.includes("Too Many Requests") ||
    err.message?.includes("quota");

  const markFailed = async () => {
    try {
      await Note.findByIdAndUpdate(noteId, { processingStatus: "failed" });
      console.error(`[Background] Note ${noteId} marked as failed`);
    } catch (e) {
      console.error(`[Background] Failed to mark note as failed:`, e.message);
    }
  };

  try {
    const note = await Note.findById(noteId);
    if (!note) return;

    await Note.findByIdAndUpdate(noteId, { processingStatus: "processing" });

    const tones = ["simple", "detailed", "eli5", "academic", "bullet"];
    const explanations = {};

    for (const tone of tones) {
      try {
        explanations[tone] = await explainNotePrompt(note, tone);
        await wait(3000);
      } catch (err) {
        console.error(`[Background] Tone "${tone}" failed:`, err.message);
        explanations[tone] = "";

        // Quota exhausted — no point trying remaining tones
        if (isQuotaError(err)) {
          console.error(
            `[Background] Quota error detected, aborting note ${noteId}`,
          );
          await markFailed();
          return;
        }
      }
    }

    const allTonesFailed = Object.values(explanations).every((v) => v === "");
    if (allTonesFailed) {
      await markFailed();
      return;
    }

    let quiz = [];
    let flashcards = [];

    try {
      await wait(3000);
      quiz = await generateQuizPrompt(note, 25);
    } catch (err) {
      console.error(`[Background] Quiz generation failed:`, err.message);
      if (isQuotaError(err)) {
        await markFailed();
        return;
      }
    }

    try {
      await wait(3000);
      flashcards = await generateFlashcardsPrompt(note);
    } catch (err) {
      console.error(`[Background] Flashcards generation failed:`, err.message);
      if (isQuotaError(err)) {
        await markFailed();
        return;
      }
    }

    await Note.findByIdAndUpdate(noteId, {
      explanations,
      quiz,
      flashcards,
      processingStatus: "complete",
    });

    console.log(`[Background] Processing complete for note ${noteId}`);
  } catch (error) {
    console.error(
      `[Background] Processing failed for note ${noteId}:`,
      error.message,
    );
    await markFailed();
  }
};