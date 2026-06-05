import { Router } from "express";
import { signup, login, getMe } from "../controllers/auth";
import { ingestFeedback, getFeedback, deleteFeedback } from "../controllers/feedback";
import { getReleases, createRelease } from "../controllers/releases";
import { getAlerts, resolveAlert } from "../controllers/alerts";
import { getSessions, createSession, deleteSession, getSessionMessages, postChatMessage } from "../controllers/chat";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// --- Authentication Routes ---
router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.get("/auth/me", authenticateToken, getMe);

// --- Feedback Routes ---
router.post("/feedback/ingest", authenticateToken, ingestFeedback);
router.get("/feedback", authenticateToken, getFeedback);
router.delete("/feedback/:id", authenticateToken, deleteFeedback);

// --- Releases Routes ---
router.get("/releases", authenticateToken, getReleases);
router.post("/releases", authenticateToken, createRelease);

// --- Alerts Routes ---
router.get("/alerts", authenticateToken, getAlerts);
router.patch("/alerts/:id/resolve", authenticateToken, resolveAlert);

// --- Chat Routes ---
router.get("/chat/sessions", authenticateToken, getSessions);
router.post("/chat/sessions", authenticateToken, createSession);
router.delete("/chat/sessions/:id", authenticateToken, deleteSession);
router.get("/chat/sessions/:sessionId/messages", authenticateToken, getSessionMessages);
router.post("/chat/message", authenticateToken, postChatMessage);

export default router;
