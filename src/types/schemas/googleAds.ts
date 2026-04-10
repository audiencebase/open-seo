import { z } from "zod";

export const googleAdsDateRangeSchema = z.object({
  projectId: z.string().min(1),
  dateFrom: z.string().min(1, "Start date is required"),
  dateTo: z.string().min(1, "End date is required"),
});

export const googleAdsSearchTermsSchema = googleAdsDateRangeSchema.extend({
  limit: z.number().int().positive().max(500).default(100),
});

export const googleAdsKeywordsSchema = googleAdsDateRangeSchema.extend({
  limit: z.number().int().positive().max(500).default(100),
});

export const googleAdsAdGroupsSchema = googleAdsDateRangeSchema.extend({
  limit: z.number().int().positive().max(500).default(100),
});

export const googleAdsAdsSchema = googleAdsDateRangeSchema.extend({
  limit: z.number().int().positive().max(100).default(50),
});

export const googleAdsProjectOnlySchema = z.object({
  projectId: z.string().min(1),
});

export const googleAdsTabSchema = z.enum([
  "overview",
  "campaigns",
  "ad-groups",
  "ads",
  "search-terms",
  "keywords",
  "negatives",
  "conversions",
  "change-log",
]);

export const googleAdsSearchParamsSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  tab: googleAdsTabSchema.optional(),
});

// Mutation schemas
export const campaignStatusMutationSchema = z.object({
  projectId: z.string().min(1),
  campaignId: z.string().min(1),
  newStatus: z.enum(["ENABLED", "PAUSED"]),
});

export const campaignBudgetMutationSchema = z.object({
  projectId: z.string().min(1),
  budgetId: z.string().min(1),
  newDailyBudgetUsd: z.number().positive().max(50000),
});

export const addNegativeKeywordSchema = z.object({
  projectId: z.string().min(1),
  campaignId: z.string().min(1),
  keywordText: z.string().min(1),
  matchType: z.enum(["BROAD", "PHRASE", "EXACT"]).default("EXACT"),
});

export type GoogleAdsTab = z.infer<typeof googleAdsTabSchema>;
export type GoogleAdsSearchParams = z.infer<typeof googleAdsSearchParamsSchema>;
