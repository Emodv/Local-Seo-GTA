import { prisma } from "../db";
import { emitProgress } from "../progress";
import { sleep } from "../utils";
import { generateGuestPostContent } from "./classifier";
import type { ClassificationResult } from "./classifier";

const platforms = [
  {
    name: "Medium",
    url: "https://medium.com/new-story",
    requiresAuth: true,
    manualGuide: "Log into Medium, click 'Write', paste the article",
    acceptsMarkdown: true,
  },
  {
    name: "LinkedIn Articles",
    url: "https://www.linkedin.com/pulse/new/",
    requiresAuth: true,
    manualGuide: "Log into LinkedIn, click 'Write article', paste the content",
    acceptsMarkdown: false,
  },
  {
    name: "Dev.to",
    url: "https://dev.to/new",
    requiresAuth: true,
    manualGuide: "Log into Dev.to, click 'Create Post', paste with Markdown",
    acceptsMarkdown: true,
  },
  {
    name: "Hashnode",
    url: "https://hashnode.com/new",
    requiresAuth: true,
    manualGuide: "Log into Hashnode, click 'Write an article', paste content",
    acceptsMarkdown: true,
  },
  {
    name: "WordPress.com",
    url: "https://wordpress.com/post/new",
    requiresAuth: true,
    manualGuide: "Log into WordPress.com, go to Posts > Add New, paste content",
    acceptsMarkdown: true,
  },
  {
    name: "Blogger",
    url: "https://draft.blogger.com/blog/post/create",
    requiresAuth: true,
    manualGuide: "Log into Blogger, click 'New Post', paste content",
    acceptsMarkdown: false,
  },
  {
    name: "Tumblr",
    url: "https://www.tumblr.com/new/text",
    requiresAuth: true,
    manualGuide: "Log into Tumblr, click 'Text', paste content",
    acceptsMarkdown: true,
  },
];

export async function publishGuestPosts(
  sessionId: string,
  classification: ClassificationResult,
  keywords: string[],
  businessUrl: string
) {
  emitProgress(sessionId, "Generating guest post article with AI...", "info");

  // Generate one high-quality article to reuse across platforms
  const { title, content } = await generateGuestPostContent(
    classification,
    keywords,
    businessUrl
  );

  emitProgress(sessionId, `Article generated: "${title}"`, "success");
  emitProgress(sessionId, `Preparing ${platforms.length} platform submissions...`, "info");

  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    emitProgress(
      sessionId,
      `Processing ${platform.name} (${i + 1}/${platforms.length})...`,
      "info"
    );

    await sleep(200);

    await prisma.guestPost.create({
      data: {
        sessionId,
        platform: platform.name,
        title,
        content,
        status: "manual_required",
        error: platform.manualGuide,
      },
    });

    emitProgress(
      sessionId,
      `${platform.name}: Article ready – ${platform.manualGuide}`,
      "warning"
    );
  }

  emitProgress(
    sessionId,
    `Guest post content ready for ${platforms.length} platforms`,
    "success"
  );

  return { title, content, platformCount: platforms.length };
}
