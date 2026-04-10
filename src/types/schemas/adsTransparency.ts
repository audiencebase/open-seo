import { z } from "zod";

// ---------------------------------------------------------------------------
// Server function input schemas
// ---------------------------------------------------------------------------

export const searchAdvertisersInputSchema = z.object({
  projectId: z.string().min(1),
  keyword: z.string().min(1, "Keyword is required").max(500),
  locationCode: z.number().int().positive().default(2840),
});

export const searchAdsInputSchema = z
  .object({
    projectId: z.string().min(1),
    advertiserIds: z.array(z.string().min(1)).min(1).max(25).optional(),
    target: z.string().min(1).max(255).optional(),
    locationCode: z.number().int().positive().optional(),
    platform: z
      .enum(["all", "google_search", "google_maps", "google_play", "google_shopping", "youtube"])
      .optional(),
    format: z.enum(["all", "text", "image", "video"]).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .refine((data) => data.advertiserIds || data.target, {
    message: "Either advertiserIds or target domain is required",
  });

export const saveAdvertiserInputSchema = z.object({
  projectId: z.string().min(1),
  advertiserId: z.string().min(1),
  advertiserName: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  keyword: z.string().min(1),
  locationCode: z.number().int().positive().default(2840),
  adsCount: z.number().nullable().optional(),
  verified: z.boolean().nullable().optional(),
});

export const removeAdvertiserInputSchema = z.object({
  projectId: z.string().min(1),
  id: z.string().min(1),
});

export const saveCreativeInputSchema = z.object({
  projectId: z.string().min(1),
  creativeId: z.string().min(1),
  advertiserId: z.string().min(1),
  title: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
  previewImage: z.string().nullable().optional(),
  firstShown: z.string().nullable().optional(),
  lastShown: z.string().nullable().optional(),
});

export const removeCreativeInputSchema = z.object({
  projectId: z.string().min(1),
  id: z.string().min(1),
});

export const getSavedInputSchema = z.object({
  projectId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// URL search param schema (for the route)
// ---------------------------------------------------------------------------

export const adsSearchModeSchema = z.enum(["keyword", "domain"]);
export const adsTabSchema = z.enum(["advertisers", "ads"]);

export const adsSearchParamsSchema = z.object({
  q: z.string().optional(),
  mode: adsSearchModeSchema.optional(),
  loc: z.coerce.number().int().positive().optional(),
  tab: adsTabSchema.optional(),
  advIds: z.string().optional(),
  platform: z
    .enum(["all", "google_search", "google_maps", "google_play", "google_shopping", "youtube"])
    .optional(),
  format: z.enum(["all", "text", "image", "video"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type AdsSearchMode = z.infer<typeof adsSearchModeSchema>;
export type AdsTab = z.infer<typeof adsTabSchema>;
export type AdsSearchParams = z.infer<typeof adsSearchParamsSchema>;
