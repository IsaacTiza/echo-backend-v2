import mongoose from "mongoose";

const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [{ type: String }],
    answer: { type: String, required: true },
    explanation: { type: String, default: "" },
  },
  { _id: false },
);

const flashcardSchema = new mongoose.Schema(
  {
    term: { type: String, required: true },
    definition: { type: String, required: true },
  },
  { _id: false },
);

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "pdf", "image", "docx", "txt"],
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    fileUrl: {
      type: String,
      default: "",
    },
    originalFilename: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },

    // All 5 tone explanations stored separately
    explanations: {
      simple: { type: String, default: "" },
      detailed: { type: String, default: "" },
      eli5: { type: String, default: "" },
      academic: { type: String, default: "" },
      bullet: { type: String, default: "" },
    },

    // Stored quiz and flashcards — generated once, accessed instantly
    quiz: { type: [quizQuestionSchema], default: [] },
    flashcards: { type: [flashcardSchema], default: [] },

    // Tracks async background processing state
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "complete", "failed"],
      default: "pending",
    },
    charged: {
      explanations: { type: [String], default: [] }, // stores which tones have been charged e.g. ["simple", "detailed"]
      quiz: { type: Boolean, default: false },
      flashcards: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

// Validation: must have content or fileUrl
noteSchema.pre("save", async function () {
  if (!this.content && !this.fileUrl) {
    throw new Error("Note must have either content or a file URL");
  }
});

// Check if a specific tone explanation exists
noteSchema.methods.hasExplanation = function (tone = "simple") {
  return !!(this.explanations?.[tone]?.length > 0);
};

// Check if quiz has been generated
noteSchema.methods.hasQuiz = function () {
  return this.quiz && this.quiz.length > 0;
};

// Check if flashcards have been generated
noteSchema.methods.hasFlashcards = function () {
  return this.flashcards && this.flashcards.length > 0;
};

export default mongoose.model("Note", noteSchema);
