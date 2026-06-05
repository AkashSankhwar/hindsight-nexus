import { Request, Response } from "express";
import prisma from "../db/client";
import { AuthRequest } from "../middleware/auth";

export const getAlerts = async (req: Request, res: Response) => {
  const { activeOnly } = req.query;

  try {
    const where: any = {};
    if (activeOnly === "true") {
      where.isActive = true;
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    return res.status(200).json({ data: alerts });
  } catch (error) {
    console.error("Fetch alerts error:", error);
    return res.status(500).json({ error: "Internal server error fetching alerts." });
  }
};

export const resolveAlert = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const alert = await prisma.alert.findUnique({
      where: { id }
    });

    if (!alert) {
      return res.status(404).json({ error: "Alert not found." });
    }

    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: {
        isActive: false,
        resolvedAt: new Date()
      }
    });

    return res.status(200).json({
      message: "Alert resolved successfully.",
      data: updatedAlert
    });
  } catch (error) {
    console.error("Resolve alert error:", error);
    return res.status(500).json({ error: "Internal server error resolving alert." });
  }
};
