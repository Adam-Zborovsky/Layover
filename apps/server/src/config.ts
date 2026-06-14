import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "0.0.0.0",
  authToken: process.env.AUTH_TOKEN || "dev-token-change-me",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  uploadDir: process.env.UPLOAD_DIR || "../data/uploads",
  dataDir: process.env.DATA_DIR || "../data",
};
