import nodemailer from "nodemailer";
import { ENV } from "./env.js";

// Create transporter for Gmail
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: ENV.GMAIL_EMAIL,
    pass: ENV.GMAIL_APP_PASSWORD,
  },
});

export const sender = {
  email: ENV.GMAIL_EMAIL,
  name: "Chatify",
};
