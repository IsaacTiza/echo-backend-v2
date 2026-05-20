const DAILY_LIMIT = 1000;

const rateLimiter = async (req, res, next) => {
  try {
    const user = req.user;

    // Check and reset usage if it's a new day
    await user.checkAndResetUsage();

    // Check if user has exceeded daily limit
    if (user.hasExceededLimit(DAILY_LIMIT)) {
      return res.status(429).json({
        message: `Daily limit of ${DAILY_LIMIT} AI requests reached. Come back tomorrow.`,
        dailyUsage: user.dailyUsage,
        limit: DAILY_LIMIT,
      });
    }

    // Attach increment function to req instead of incrementing immediately
    req.incrementUsage = async () => {
      user.dailyUsage += 1;
      await user.save();
    };

    next();
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Rate limiter error", error: error.message });
  }
};

export default rateLimiter;
