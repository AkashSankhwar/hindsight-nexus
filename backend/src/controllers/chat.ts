import { Response } from "express";
import prisma from "../db/client";
import { AuthRequest } from "../middleware/auth";
import { AIService } from "../services/aiStub";

export const getSessions = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });
    return res.status(200).json({ data: sessions });
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return res.status(500).json({ error: "Internal server error fetching chat sessions." });
  }
};

export const createSession = async (req: AuthRequest, res: Response) => {
  const { title } = req.body;
  const userId = req.user?.id;

  try {
    const session = await prisma.chatSession.create({
      data: {
        title: title || "New Chat Conversation",
        userId
      }
    });
    return res.status(201).json({ data: session });
  } catch (error) {
    console.error("Create session error:", error);
    return res.status(500).json({ error: "Internal server error creating chat session." });
  }
};

export const deleteSession = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const session = await prisma.chatSession.findFirst({
      where: { id, userId }
    });

    if (!session) {
      return res.status(404).json({ error: "Chat session not found." });
    }

    await prisma.chatSession.delete({
      where: { id }
    });

    return res.status(200).json({ message: "Chat session deleted successfully." });
  } catch (error) {
    console.error("Delete session error:", error);
    return res.status(500).json({ error: "Internal server error deleting session." });
  }
};

export const getSessionMessages = async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user?.id;

  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" }
    });

    return res.status(200).json({ data: messages });
  } catch (error) {
    console.error("Fetch messages error:", error);
    return res.status(500).json({ error: "Internal server error fetching session messages." });
  }
};

export const postChatMessage = async (req: AuthRequest, res: Response) => {
  const { sessionId, content } = req.body;
  const userId = req.user?.id;

  if (!sessionId || !content) {
    return res.status(400).json({ error: "sessionId and message content are required." });
  }

  try {
    // 1. Verify session ownership
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({ error: "Chat session not found." });
    }

    // 2. Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: "user",
        content
      }
    });

    // 3. Load message history for conversational memory
    const history = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: 10
    });

    // 4. Perform keyword-based local search for relevant feedback (RAG)
    // Extract keywords (excluding small common words)
    const keywords = content
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 3);

    // Find feedbacks matching any of the keywords
    let contextFeedbacks: any[] = [];
    if (keywords.length > 0) {
      const orConditions = keywords.map(kw => ({
        content: { contains: kw }
      }));

      contextFeedbacks = await prisma.feedback.findMany({
        where: {
          OR: orConditions
        },
        orderBy: { receivedAt: "desc" },
        take: 3,
        include: { release: true }
      });
    }

    // 5. Generate Response via Member 3's AI Service
    const answer = await AIService.generateChatResponse(
      content,
      history.map(m => ({ role: m.role, content: m.content })),
      contextFeedbacks
    );

    // 6. Save assistant message
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: "assistant",
        content: answer
      }
    });

    // 7. Auto-update chat session title if it's currently the default
    if (session.title === "New Chat Conversation" || session.title === "New Chat") {
      const summaryTitle = content.length > 25 ? content.slice(0, 22) + "..." : content;
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { title: summaryTitle }
      });
    }

    return res.status(201).json({
      data: {
        userMessage,
        assistantMessage,
        context: contextFeedbacks.map(f => ({
          id: f.id,
          content: f.content,
          sentiment: f.sentiment,
          category: f.category,
          productArea: f.productArea,
          releaseVersion: f.release?.version
        }))
      }
    });
  } catch (error) {
    console.error("Chat message processing error:", error);
    return res.status(500).json({ error: "Internal server error processing chat message." });
  }
};
