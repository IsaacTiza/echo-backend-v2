import jwt from "jsonwebtoken";
import User from "../models/User.js";

const issueToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const sendTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: true, // must be true when sameSite is none
    sameSite: "none", // ← allows cross-origin cookie attachment
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

export const googleCallback = (req, res) => {
  try {
    const token = issueToken(req.user);
    // Don't set cookie. Pass token to frontend via URL.
    res.redirect(`${process.env.CLIENT_URL}/dashboard?token=${token}`);
  } catch (error) {
    res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
  }
};

export const facebookCallback = (req, res) => {
  try {
    const token = issueToken(req.user);
    // Don't set cookie. Pass token to frontend via URL.
    res.redirect(`${process.env.CLIENT_URL}/dashboard?token=${token}`);
  } catch (error) {
    res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
  }
};

export const logout = (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-providerId");
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
