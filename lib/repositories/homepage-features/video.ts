import { cache } from "react";
import { type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { VIDEO_SLOT } from "./slots";

/**
 * The homepage video section — components/home/VideoSection.tsx (Pass D.1).
 *
 * The section's ONLY configurable content is its video. Its placeholder copy
 * (`video.brand`) stays a dictionary string, and its layout, scroll-triggered
 * loading and play/pause behaviour are untouched by this slot — a form field
 * was added only where the component already had something an operator would
 * want to change without editing source.
 *
 * `videoUrl` is nullable, and since the operator DELETED the stock
 * `/videos/afterhenge.mp4` (Pass D.1 follow-up) NULL means "no video" — the
 * section renders nothing rather than falling back to a shipped film.
 * which is why this table needs no backfill: an empty table renders the section
 * exactly as it always did.
 */
export type ResolvedVideoFeature = {
  enabled: boolean;
  /** Absolute storage URL, or a path under /public. NULL = built-in asset. */
  videoUrl: string | null;
};

/** The video section as the admin form submits it. */
export type VideoFeatureWriteInput = {
  enabled: boolean;
  videoUrl: string | null;
};

/** The section the public page renders; `null` when never saved. */
export const getVideoFeature = cache(
  async (): Promise<ResolvedVideoFeature | null> => {
    const row = await prisma.videoFeature.findUnique({
      where: { id: VIDEO_SLOT },
    });
    if (!row) return null;

    return { enabled: row.enabled, videoUrl: row.videoUrl };
  },
);

/** The section as the admin form edits it. */
export const getVideoFeatureAdminDetail = cache(
  async (): Promise<VideoFeatureWriteInput | null> => {
    const row = await prisma.videoFeature.findUnique({
      where: { id: VIDEO_SLOT },
    });
    if (!row) return null;

    return { enabled: row.enabled, videoUrl: row.videoUrl };
  },
);

/** Saves the video slot (singleton upsert, see flagship-one.ts). */
export const updateVideoFeature = async (
  input: VideoFeatureWriteInput,
  db: Prisma.TransactionClient = prisma,
): Promise<void> => {
  const data = { enabled: input.enabled, videoUrl: input.videoUrl };

  await db.videoFeature.upsert({
    where: { id: VIDEO_SLOT },
    create: { id: VIDEO_SLOT, ...data },
    update: data,
  });
};
