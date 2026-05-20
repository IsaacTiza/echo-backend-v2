import Note from "../models/Note.js";
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

    const tone = req.body.tone || note.tone || "simple";
    const explanation = await explainNotePrompt(note, tone, req.user.email);

    await req.incrementUsage();

    note.explanation = explanation;
    note.tone = tone;
    await note.save();

    res.status(200).json({ explanation });
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

    const count = req.body.count || 12;
    const quiz = await generateQuizPrompt(note, count, req.user.email);

    await req.incrementUsage();

    res.status(200).json({ quiz });
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

    const flashcards = await generateFlashcardsPrompt(note, req.user.email);

    await req.incrementUsage();

    res.status(200).json({ flashcards });
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

    const explanation = await explainFailedTopicsPrompt(
      note,
      failedTopics,
      req.user.email,
    );

    await req.incrementUsage();

    res.status(200).json({ explanation });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};