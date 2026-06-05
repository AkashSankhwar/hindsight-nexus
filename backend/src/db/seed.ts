import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with mock data...");

  // 1. Clear existing data
  await prisma.correlation.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.release.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleared existing database tables.");

  // 2. Create default Admin User
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@hindsight.com",
      passwordHash: adminPasswordHash,
      name: "Admin Lead",
      role: "ADMIN"
    }
  });
  console.log(`Created Admin User: ${admin.email}`);

  // 3. Create Releases
  const date30DaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const date5DaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  const release1 = await prisma.release.create({
    data: {
      version: "v1.0",
      description: "Initial platform release with core authentication and dashboard features.",
      deployedAt: date30DaysAgo
    }
  });

  const release2 = await prisma.release.create({
    data: {
      version: "v1.1",
      description: "Payment integration upgrade and checkout optimization release.",
      deployedAt: date5DaysAgo
    }
  });

  console.log(`Created Releases: ${release1.version}, ${release2.version}`);

  // 4. Create Historical Feedbacks
  // Feedbacks during v1.0 (Mostly positive, some suggestions)
  const feedbackV1 = [
    {
      content: "The dashboard analytics are incredibly fast. Love the visual charts!",
      source: "MANUAL",
      sentiment: 0.8,
      category: "POSITIVE_FEEDBACK",
      productArea: "Analytics Dashboard",
      receivedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      releaseId: release1.id
    },
    {
      content: "Login is smooth, but I wish there was a 'remember me' checkbox on the credentials screen.",
      source: "EMAIL",
      sentiment: 0.1,
      category: "FEATURE_REQUEST",
      productArea: "Authentication",
      receivedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      releaseId: release1.id
    },
    {
      content: "The signup flow is a bit confusing. The password validation rules are not clearly documented.",
      source: "SURVEY",
      sentiment: -0.2,
      category: "UX_ISSUE",
      productArea: "Authentication",
      receivedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      releaseId: release1.id
    }
  ];

  // Feedbacks during v1.1 (Spike in checkout errors)
  const feedbackV2 = [
    {
      content: "I tried purchasing the subscription, but the stripe checkout page keeps loading forever.",
      source: "ZENDESK",
      sentiment: -0.7,
      category: "BUG_REPORT",
      productArea: "Checkout",
      receivedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      releaseId: release2.id
    },
    {
      content: "Getting error 'Card validation failed' when trying to pay. It was working yesterday before the update.",
      source: "APP_STORE",
      sentiment: -0.8,
      category: "BUG_REPORT",
      productArea: "Checkout",
      receivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      releaseId: release2.id
    },
    {
      content: "Payment checkout failed at the final step! The page crashed and didn't confirm my order.",
      source: "ZENDESK",
      sentiment: -0.9,
      category: "BUG_REPORT",
      productArea: "Checkout",
      receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      releaseId: release2.id
    },
    {
      content: "Can we get support for Apple Pay in the checkout? Clicking pay is a hassle.",
      source: "FEATURE_REQUEST",
      sentiment: 0.0,
      category: "FEATURE_REQUEST",
      productArea: "Checkout",
      receivedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      releaseId: release2.id
    }
  ];

  for (const item of [...feedbackV1, ...feedbackV2]) {
    await prisma.feedback.create({
      data: item
    });
  }

  console.log("Inserted historical feedback items.");

  // 5. Create Correlation (Link the two similar checkout crash complaints)
  const checkoutFeedbacks = await prisma.feedback.findMany({
    where: {
      productArea: "Checkout",
      category: "BUG_REPORT"
    }
  });

  if (checkoutFeedbacks.length >= 2) {
    await prisma.correlation.create({
      data: {
        sourceFeedbackId: checkoutFeedbacks[0].id,
        targetFeedbackId: checkoutFeedbacks[1].id,
        confidenceScore: 0.85,
        reason: "Both feedbacks describe failures during the payment transaction/checkout stage directly after the v1.1 deployment."
      }
    });
    console.log("Created historical semantic correlation link.");
  }

  // 6. Create Alert for Checkout Anomaly
  await prisma.alert.create({
    data: {
      title: "Spike in complaints on: Checkout",
      message: "Average feedback sentiment for 'Checkout' dropped to -0.60 based on 4 recent reviews.",
      type: "CRITICAL",
      productArea: "Checkout",
      isActive: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  });

  console.log("Created mock Checkout anomaly alert.");
  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
