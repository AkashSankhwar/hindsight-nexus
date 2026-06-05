import { PrismaClient } from "@prisma/client";

/**
 * analyticsStub.ts - Data & Analytics Service Stub
 *
 * This file contains stubs for the Data & Analytics Engineer (Member 4)
 * to implement sentiment analysis, trend calculations, and memory graphs.
 *
 * It provides a simulated sentiment analyzer and automatic anomaly/alert checker.
 */

const prisma = new PrismaClient();

export class AnalyticsService {
  /**
   * Performs sentiment analysis on feedback text.
   * Returns a score between -1.0 (extremely negative) and 1.0 (extremely positive).
   * Member 4: Replace this with advanced VADER, AFINN, or LLM-based sentiment scoring.
   */
  static analyzeSentiment(content: string): number {
    const text = content.toLowerCase();
    
    // Keyword score points
    const positiveWords = ["great", "love", "good", "perfect", "awesome", "help", "satisfied", "excellent", "fast", "thanks"];
    const negativeWords = ["bad", "error", "fail", "broke", "crash", "bug", "slow", "delay", "worst", "terrible", "hate", "issue", "problem", "annoyed"];

    let score = 0.0;
    
    positiveWords.forEach(word => {
      if (text.includes(word)) score += 0.25;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) score -= 0.35;
    });

    // Clamp score between -1.0 and 1.0
    return Math.max(-1.0, Math.min(1.0, score));
  }

  /**
   * Scans database to check for negative feedback spikes and generates system alerts.
   * Member 4: Implement complex statistical windowing or moving average anomaly detection.
   */
  static async checkForAlerts(productArea: string): Promise<void> {
    try {
      // Find recent feedback for this product area (e.g. last 24-48 hours)
      const recentFeedback = await prisma.feedback.findMany({
        where: {
          productArea,
          createdAt: {
            gte: new Date(Date.now() - 48 * 60 * 60 * 1000) // last 48 hours
          }
        }
      });

      if (recentFeedback.length < 3) return; // Need a minimum sample size to flag an alert

      // Compute average sentiment
      const sentiments = recentFeedback.map(f => f.sentiment || 0.0);
      const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;

      // Flag alert if average sentiment drops below -0.2 and count is high
      if (avgSentiment < -0.2) {
        // Check if active alert already exists to prevent duplicate alerts
        const activeAlert = await prisma.alert.findFirst({
          where: {
            productArea,
            isActive: true
          }
        });

        if (!activeAlert) {
          await prisma.alert.create({
            data: {
              title: `Spike in complaints on: ${productArea}`,
              message: `Average feedback sentiment for '${productArea}' dropped to ${avgSentiment.toFixed(2)} based on ${recentFeedback.length} recent entries.`,
              type: avgSentiment < -0.5 ? "CRITICAL" : "WARNING",
              productArea,
              isActive: true
            }
          });
          console.log(`[Alert System] Created alert for ${productArea}`);
        }
      }
    } catch (error) {
      console.error("Error in checkForAlerts:", error);
    }
  }
}
