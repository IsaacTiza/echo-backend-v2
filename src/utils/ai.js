// import { GoogleGenerativeAI } from "@google/generative-ai";
// import Anthropic from "@anthropic-ai/sdk";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const geminiModel = genAI.getGenerativeModel({
//   model: "gemini-2.0-flash-lite",
// });

// const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// // Whitelisted emails routed to Claude
// const CLAUDE_USERS = (process.env.CLAUDE_WHITELIST || "")
//   .split(",")
//   .map((e) => e.trim().toLowerCase());

// const isClaudeUser = (email) => CLAUDE_USERS.includes(email?.toLowerCase());

// const generateWithGemini = async (parts) => {
//   const result = await geminiModel.generateContent({
//     contents: [{ role: "user", parts }],
//   });
//   return result.response.text();
// };

// const generateWithClaude = async (promptText, note) => {
//   let content = [];

//   if (note.content) {
//     content = [
//       { type: "text", text: `${promptText}\n\nNote Content:\n${note.content}` },
//     ];
//   } else if (note.fileUrl) {
//     const response = await fetch(note.fileUrl);
//     const buffer = await response.arrayBuffer();
//     const base64 = Buffer.from(buffer).toString("base64");
//     const mimeType = note.type === "pdf" ? "application/pdf" : "image/jpeg";
//     content = [
//       { type: "text", text: promptText },
//       {
//         type: "document",
//         source: { type: "base64", media_type: mimeType, data: base64 },
//       },
//     ];
//   }

//   const message = await anthropic.messages.create({
//     model: "claude-sonnet-4-20250514",
//     max_tokens: 2000,
//     messages: [{ role: "user", content }],
//   });

//   return message.content[0].text;
// };

// const buildGeminiParts = async (note, promptText) => {
//   if (note.content) {
//     return [{ text: `${promptText}\n\nNote Content:\n${note.content}` }];
//   }

//   if (note.fileUrl) {
//     const response = await fetch(note.fileUrl);
//     const buffer = await response.arrayBuffer();
//     const base64 = Buffer.from(buffer).toString("base64");
//     const mimeType = note.type === "pdf" ? "application/pdf" : "image/jpeg";
//     return [{ text: promptText }, { inlineData: { mimeType, data: base64 } }];
//   }

//   throw new Error("Note has no content or file URL");
// };

// const generate = async (note, promptText, userEmail) => {
//   if (isClaudeUser(userEmail)) {
//     return await generateWithClaude(promptText, note);
//   }
//   const parts = await buildGeminiParts(note, promptText);
//   return await generateWithGemini(parts);
// };

// const toneInstructions = {
//   simple:
//     "Explain in simple, easy to understand language suitable for any student.",
//   detailed:
//     "Provide a thorough and detailed explanation covering all key points in depth.",
//   eli5: "Explain this like I am 5 years old. Use very simple words, analogies and examples.",
//   academic:
//     "Explain in a formal academic tone with proper terminology and structure.",
//   bullet:
//     "Explain using clear bullet points and short sentences. Be concise and organized.",
// };

// export const explainNotePrompt = async (note, tone, userEmail) => {
//   const toneText = toneInstructions[tone] || toneInstructions.simple;
//   const promptText = `You are an expert study assistant. ${toneText}
// Explain the following study note clearly and thoroughly.
// Structure your explanation with a brief overview first, then go through the key concepts.`;
//   return await generate(note, promptText, userEmail);
// };

// export const generateQuizPrompt = async (note, count, userEmail) => {
//   const promptText = `You are an expert study assistant. Generate exactly ${count} multiple choice questions based on the following study note.

// Return ONLY a valid JSON array with no extra text, markdown, or code blocks. Use this exact format:
// [
//   {
//     "question": "Question text here",
//     "options": ["A. option one", "B. option two", "C. option three", "D. option four"],
//     "answer": "A. option one",
//     "explanation": "Brief explanation of why this is correct"
//   }
// ]`;

//   const result = await generate(note, promptText, userEmail);
//   const clean = result.replace(/```json|```/g, "").trim();
//   return JSON.parse(clean);
// };

// export const generateFlashcardsPrompt = async (note, userEmail) => {
//   const promptText = `You are an expert study assistant. Generate flashcards from the following study note.

// Return ONLY a valid JSON array with no extra text, markdown, or code blocks. Use this exact format:
// [
//   {
//     "term": "Key term or concept",
//     "definition": "Clear concise definition or explanation"
//   }
// ]`;

//   const result = await generate(note, promptText, userEmail);
//   const clean = result.replace(/```json|```/g, "").trim();
//   return JSON.parse(clean);
// };

// export const explainFailedTopicsPrompt = async (
//   note,
//   failedTopics,
//   userEmail,
// ) => {
//   const topicsList = failedTopics.join("\n- ");
//   const promptText = `You are an expert study assistant. A student just completed a quiz on their study note and struggled with the following topics:

// - ${topicsList}

// Based on the study note provided, give a clear and focused explanation of only these topics the student got wrong.
// Be encouraging in tone. Start with "Let's go over the areas you need to review:" and address each topic directly.`;

//   return await generate(note, promptText, userEmail);
// };
