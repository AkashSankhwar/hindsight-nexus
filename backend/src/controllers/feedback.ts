import { Request, Response } from "express";
import prisma from "../db/client";
import { AuthRequest } from "../middleware/auth";
import { AIService } from "../services/aiStub";
import { AnalyticsService } from "../services/analyticsStub";

// Helper function to ingest a single feedback item and run calculations
async function processFeedbackIngest(content: string, source: string, receivedAtDate?: Date, userId?: string) {
  // 1. Analyze sentiment (Member 4 Service)
  const sentiment = AnalyticsService.analyzeSentiment(content);

  // 2. Classify content (Member 3 Service)
  const classification = await AIService.classifyFeedback(content);

  // 3. Find if there is an active release matching the date, or map it to the latest release
  const receivedAt = receivedAtDate ? new Date(receivedAtDate) : new Date();
  const associatedRelease = await prisma.release.findFirst({
    where: {
      deployedAt: {
        lte: receivedAt
      }
    },
    orderBy: {
      deployedAt: "desc"
    }
  });

  // 4. Create Feedback record
  const feedback = await prisma.feedback.create({
    data: {
      content,
      source,
      sentiment,
      category: classification.category,
      productArea: classification.productArea,
      detectedIssue: classification.detectedIssue,
      receivedAt,
      releaseId: associatedRelease ? associatedRelease.id : undefined,
      userId
    }
  });

  // 5. Semantic Correlation (Member 3/4 integration: Mocked similarity check with recent items)
  // Find other feedbacks in the same productArea to check similarity
  const similarItems = await prisma.feedback.findMany({
    where: {
      productArea: feedback.productArea,
      id: { not: feedback.id },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // last 30 days
    },
    take: 5
  });

  for (const item of similarItems) {
    // Basic word overlap calculation as a mock cosine similarity
    const setA = new Set(content.toLowerCase().split(/\s+/));
    const setB = new Set(item.content.toLowerCase().split(/\s+/));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    
    // Similarity score based on keyword intersection
    const score = (intersection.size * 2) / (setA.size + setB.size);

    // If similarity is above 0.4 (simplified for keyword overlap), create correlation
    if (score >= 0.4) {
      await prisma.correlation.create({
        data: {
          sourceFeedbackId: feedback.id,
          targetFeedbackId: item.id,
          confidenceScore: parseFloat(score.toFixed(2)),
          reason: `Auto-correlated due to matching key phrases in ${feedback.productArea}: "${Array.from(intersection).slice(0, 3).join(", ")}"`
        }
      }).catch(() => {
        // Suppress unique constraint duplicate errors
      });
    }
  }

  // 6. Proactive Anomaly Alert Check (Member 4 Service)
  await AnalyticsService.checkForAlerts(feedback.productArea);

  return feedback;
}

export const ingestFeedback = async (req: AuthRequest, res: Response) => {
  const { feedback, content, source } = req.body;
  const userId = req.user?.id;

  try {
    // Batch Ingestion
    if (Array.isArray(feedback)) {
      const results = [];
      for (const item of feedback) {
        const text = item.content || item.Content;
        const src = item.source || item.Source || source || "CSV_UPLOAD";
        const date = item.receivedAt || item.Date;
        
        if (text) {
          const resItem = await processFeedbackIngest(text, src, date, userId);
          results.push(resItem);
        }
      }
      return res.status(201).json({
        message: `Successfully processed ${results.length} feedback items.`,
        count: results.length,
        data: results
      });
    }

    // Single Ingestion
    if (!content) {
      return res.status(400).json({ error: "Content field is required for ingestion." });
    }

    const item = await processFeedbackIngest(content, source || "MANUAL", undefined, userId);
    return res.status(201).json({
      message: "Feedback ingested successfully",
      data: item
    });
  } catch (error) {
    console.error("Ingestion error:", error);
    return res.status(500).json({ error: "Internal server error during ingestion." });
  }
};

export const getFeedback = async (req: Request, res: Response) => {
  const { category, productArea, source, search, limit, page, minSentiment, maxSentiment } = req.query;

  const pageSize = parseInt(limit as string) || 20;
  const pageIndex = parseInt(page as string) || 1;
  const skip = (pageIndex - 1) * pageSize;

  // Build filters
  const where: any = {};

  if (category) where.category = category as string;
  if (productArea) where.productArea = productArea as string;
  if (source) where.source = source as string;

  if (minSentiment || maxSentiment) {
    where.sentiment = {};
    if (minSentiment) where.sentiment.gte = parseFloat(minSentiment as string);
    if (maxSentiment) where.sentiment.lte = parseFloat(maxSentiment as string);
  }

  if (search) {
    where.content = {
      contains: search as string
    };
  }

  try {
    const totalCount = await prisma.feedback.count({ where });
    const items = await prisma.feedback.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        release: true,
        user: {
          select: { name: true, email: true }
        }
      }
    });

    return res.status(200).json({
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: pageIndex,
        pageSize
      },
      data: items
    });
  } catch (error) {
    console.error("Fetch feedback error:", error);
    return res.status(500).json({ error: "Internal server error fetching feedback." });
  }
};

export const deleteFeedback = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const item = await prisma.feedback.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ error: "Feedback not found." });
    }

    await prisma.feedback.delete({ where: { id } });
    return res.status(200).json({ message: "Feedback deleted successfully." });
  } catch (error) {
    console.error("Delete feedback error:", error);
    return res.status(500).json({ error: "Internal server error deleting feedback." });
  }
};
