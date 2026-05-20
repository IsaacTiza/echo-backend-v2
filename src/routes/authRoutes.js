import express from "express";
import passport from "passport";
import {
  googleCallback,
  facebookCallback,
  logout,
  getMe,
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  googleCallback,
);

// Facebook OAuth
// router.get("/facebook", passport.authenticate("facebook", { scope: [] }));
// router.get(
//   "/facebook/callback",
//   passport.authenticate("facebook", {
//     session: false,
//     failureRedirect: "/login",
//   }),
//   facebookCallback,
// );

// Auth utilities
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);

export default router;
