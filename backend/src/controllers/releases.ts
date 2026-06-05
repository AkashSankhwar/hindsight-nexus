import { Request, Response } from "express";
import prisma from "../db/client";
import { AuthRequest } from "../middleware/auth";

export const getReleases = async (req: Request, res: Response) => {
  try {
    const releases = await prisma.release.findMany({
      orderBy: { deployedAt: "desc" },
      include: {
        _count: {
          select: { feedbacks: true }
        }
      }
    });
    return res.status(200).json({ data: releases });
  } catch (error) {
    console.error("Fetch releases error:", error);
    return res.status(500).json({ error: "Internal server error fetching releases." });
  }
};

export const createRelease = async (req: AuthRequest, res: Response) => {
  const { version, description, deployedAt } = req.body;

  if (!version || !deployedAt) {
    return res.status(400).json({ error: "Version and deployedAt date are required." });
  }

  try {
    const parsedDate = new Date(deployedAt);

    // Check if release version already exists
    const existing = await prisma.release.findUnique({
      where: { version }
    });

    if (existing) {
      return res.status(400).json({ error: `Release version ${version} already exists.` });
    }

    const release = await prisma.release.create({
      data: {
        version,
        description,
        deployedAt: parsedDate
      }
    });

    // Retrospective link: update older feedbacks to point to this release
    // Find all releases ordered by deployedAt to partition timelines
    const allReleases = await prisma.release.findMany({
      orderBy: { deployedAt: "asc" }
    });

    const currentIdx = allReleases.findIndex(r => r.id === release.id);
    const nextRelease = allReleases[currentIdx + 1];

    // Update feedbacks received after deployedAt (and before nextRelease's deployedAt, if it exists)
    const updateCondition: any = {
      receivedAt: {
        gte: parsedDate
      }
    };

    if (nextRelease) {
      updateCondition.receivedAt.lt = new Date(nextRelease.deployedAt);
    }

    const updatedFeedbacks = await prisma.feedback.updateMany({
      where: updateCondition,
      data: {
        releaseId: release.id
      }
    });

    return res.status(201).json({
      message: "Release created successfully and feedback database linked retrospectively.",
      data: release,
      linkedFeedbacksCount: updatedFeedbacks.count
    });
  } catch (error) {
    console.error("Create release error:", error);
    return res.status(500).json({ error: "Internal server error creating release." });
  }
};
