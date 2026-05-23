import express from "express";
import protect from "../middleware/authMiddleware.js";
import rateLimiter from "../middleware/rateLimiter.js";
import {
  explainNote,
  generateQuiz,
  generateFlashcards,
  explainFailedTopics,
  getProcessingStatus,
} from "../controllers/aiController.js";

const router = express.Router();

router.post("/explain/:noteId", protect, rateLimiter, explainNote);
router.post("/quiz/:noteId", protect, rateLimiter, generateQuiz);
router.post("/flashcards/:noteId", protect, rateLimiter, generateFlashcards);
router.post(
  "/explain-failed/:noteId",
  protect,
  rateLimiter,
  explainFailedTopics,
);
router.get("/status/:noteId", protect, getProcessingStatus);

export default router;
