import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRouter from "./routes/api";
import prisma from "./db/client";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// API Health Check
app.get("/api/health", async (req, res) => {
  try {
    // Basic DB check
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: "UP",
      database: "CONNECTED",
      timestamp: new Date()
    });
  } catch (error) {
    return res.status(500).json({
      status: "DOWN",
      database: "DISCONNECTED",
      error: error instanceof Error ? error.message : "Database connection failed"
    });
  }
});

// Mount Routes
app.use("/api", apiRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  return res.status(500).json({
    error: "An unexpected error occurred on the server."
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Hindsight Nexus Backend running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down backend server...");
  await prisma.$disconnect();
  server.close(() => {
    console.log("Server closed. Goodbye!");
    process.exit(0);
  });
});
