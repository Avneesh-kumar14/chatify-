import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { app, server } from "./lib/socket.js";
import { errorHandler } from "./lib/errors.js";

// Correctly set __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = ENV.PORT || 3000;

app.use(express.json({ limit: "5mb" })); // req.body
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));
app.use(cookieParser());

// API routes MUST come before frontend serving
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// ✅ Serve React frontend (ALWAYS - no env dependency)
const frontendPath = path.join(process.cwd(), "frontend", "dist");

console.log("Serving frontend from:", frontendPath);

app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ✅ ERROR HANDLING MIDDLEWARE (MUST be last)
app.use(errorHandler);

server.listen(PORT, () => {
  console.log("Server running on port: " + PORT);
  connectDB();
});

