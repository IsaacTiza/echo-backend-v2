import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    provider: {
      type: String,
      enum: ["google", "facebook"],
      required: true,
    },
    providerId: {
      type: String,
      required: true,
    },
    dailyUsage: {
      type: Number,
      default: 0,
    },
    lastResetDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Reset daily usage if it's a new day
userSchema.methods.checkAndResetUsage = async function () {
  const now = new Date();
  const last = new Date(this.lastResetDate);
  const isNewDay =
    now.getDate() !== last.getDate() ||
    now.getMonth() !== last.getMonth() ||
    now.getFullYear() !== last.getFullYear();

  if (isNewDay) {
    this.dailyUsage = 0;
    this.lastResetDate = now;
    await this.save();
  }
};

// Check if user has exceeded daily limit
userSchema.methods.hasExceededLimit = function (limit = 10) {
  return this.dailyUsage >= limit;
};

export default mongoose.model("User", userSchema);
