import mongoose from "mongoose";

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
    explanation: {
      type: String,
      default: "",
    },
    tone: {
      type: String,
      enum: ["simple", "detailed", "eli5", "academic", "bullet"],
      default: "simple",
    },
  },
  { timestamps: true },
);

// Ensure either content or fileUrl is present before saving
noteSchema.pre("save", async function () {
  if (!this.content && !this.fileUrl) {
    throw new Error("Note must have either content or a file URL");
  }
});

// Instance method to check if note has been explained already
noteSchema.methods.hasExplanation = function () {
  return this.explanation && this.explanation.length > 0;
};

export default mongoose.model("Note", noteSchema);
