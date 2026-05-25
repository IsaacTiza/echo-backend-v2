import Note from "../models/Note.js";
import { getCache, setCache } from "../utils/cache.js";
import {
  explainNotePrompt,
  generateQuizPrompt,
  generateFlashcardsPrompt,
  explainFailedTopicsPrompt,
} from "../utils/gemini.js";

export const explainNote = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.noteId,
      userId: req.user._id,
    });
    if (!note) return res.status(404).json({ message: "Note not found" });

    const tone = req.body.tone || "simple";
    const cacheKey = `explanation:${note._id}:${tone}`;

    // 1. Check Redis
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ explanation: cached, source: "redis" });
    }

    // 2. Check MongoDB
    if (note.explanations?.[tone]) {
      if (!note.charged.explanations.includes(tone)) {
        await req.incrementUsage();
        await Note.findByIdAndUpdate(note._id, {
          $addToSet: { "charged.explanations": tone },
        });
      }
      // Store in Redis for next time
      await setCache(cacheKey, note.explanations[tone]);
      return res
        .status(200)
        .json({ explanation: note.explanations[tone], source: "db" });
    }

    // 3. Call Gemini — last resort
    const explanation = await explainNotePrompt(note, tone);
    await req.incrementUsage();

    await Note.findByIdAndUpdate(note._id, {
      [`explanations.${tone}`]: explanation,
      $addToSet: { "charged.explanations": tone },
    });

    await setCache(cacheKey, explanation);

    res.status(200).json({ explanation, source: "generated" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const generateQuiz = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.noteId,
      userId: req.user._id,
    });
    if (!note) return res.status(404).json({ message: "Note not found" });

    const count = parseInt(req.body.count) || 10;
    const usedIds = new Set((req.body.usedIds || []).map(String));
    const cacheKey = `quiz:${note._id}`;

    const pickFrom = (pool) =>
      pool.filter((q) => !usedIds.has(String(q._id))).slice(0, count);

    // 1. Check Redis
    const cached = await getCache(cacheKey);
    if (cached) {
      const questions = pickFrom(cached);
      if (questions.length >= count) {
        return res.status(200).json({ quiz: questions, source: "redis" });
      }
      // Not enough unseen in cache — fall through to DB
    }

    // 2. Check MongoDB
    if (note.quiz?.length > 0) {
      if (!note.charged.quiz) {
        await req.incrementUsage();
        await Note.findByIdAndUpdate(note._id, { "charged.quiz": true });
      }

      const questions = pickFrom(note.quiz);

      if (questions.length >= count) {
        await setCache(cacheKey, note.quiz);
        return res.status(200).json({ quiz: questions, source: "db" });
      }

      // Pool exhausted — generate a fresh batch and append
      const freshBatch = await generateQuizPrompt(note, 15, note.quiz);
      const expandedPool = [...note.quiz, ...freshBatch];

      await Note.findByIdAndUpdate(note._id, { quiz: expandedPool });
      await setCache(cacheKey, expandedPool);

      const freshPick = pickFrom(expandedPool);
      return res
        .status(200)
        .json({ quiz: freshPick.slice(0, count), source: "expanded" });
    }

    // 3. Gemini fallback (quiz was never pre-generated)
    const quiz = await generateQuizPrompt(note, 25);
    await req.incrementUsage();
    await Note.findByIdAndUpdate(note._id, { quiz, "charged.quiz": true });
    await setCache(cacheKey, quiz);

    res.status(200).json({ quiz: pickFrom(quiz), source: "generated" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const generateFlashcards = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.noteId,
      userId: req.user._id,
    });
    if (!note) return res.status(404).json({ message: "Note not found" });

    const cacheKey = `flashcards:${note._id}`;

    // 1. Check Redis
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ flashcards: cached, source: "redis" });
    }

    // 2. Check MongoDB
    if (note.flashcards?.length > 0) {
      if (!note.charged.flashcards) {
        await req.incrementUsage();
        await Note.findByIdAndUpdate(note._id, { "charged.flashcards": true });
      }
      await setCache(cacheKey, note.flashcards);
      return res
        .status(200)
        .json({ flashcards: note.flashcards, source: "db" });
    }

    // 3. Call Gemini
    const flashcards = await generateFlashcardsPrompt(note);
    await req.incrementUsage();

    await Note.findByIdAndUpdate(note._id, {
      flashcards,
      "charged.flashcards": true,
    });
    await setCache(cacheKey, flashcards);

    res.status(200).json({ flashcards, source: "generated" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const explainFailedTopics = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.noteId,
      userId: req.user._id,
    });
    if (!note) return res.status(404).json({ message: "Note not found" });

    const { failedTopics } = req.body;
    if (!failedTopics || failedTopics.length === 0) {
      return res.status(400).json({ message: "No failed topics provided" });
    }

    const explanation = await explainFailedTopicsPrompt(note, failedTopics);
    await req.incrementUsage();

    res.status(200).json({ explanation });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getProcessingStatus = async (req, res) => {
  try {
    const note = await Note.findOne(
      { _id: req.params.noteId, userId: req.user._id },
      "processingStatus",
    );
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.status(200).json({ status: note.processingStatus });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
