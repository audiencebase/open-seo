import { createServerFn } from "@tanstack/react-start";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  googleAdsDateRangeSchema,
  googleAdsSearchTermsSchema,
  googleAdsKeywordsSchema,
  googleAdsAdGroupsSchema,
  googleAdsAdsSchema,
  googleAdsProjectOnlySchema,
  campaignStatusMutationSchema,
  campaignBudgetMutationSchema,
  addNegativeKeywordSchema,
} from "@/types/schemas/googleAds";
import {
  verifyGoogleAdsAuth,
  fetchAccountSummary,
  fetchCampaignPerformance,
  fetchSearchTermReport,
  fetchKeywordPerformance,
  fetchAdGroupPerformance,
  fetchAdPerformance,
  fetchNegativeKeywords,
  fetchConversionActions,
  fetchCampaignBudgets,
  mutateCampaignStatus,
  mutateCampaignBudget,
  mutateAddNegativeKeyword,
} from "@/server/lib/googleAds";
import {
  logGadsChange,
  getGadsChangeLog,
} from "@/server/features/googleAds/changeLog";
import { buildCacheKey, getCached, setCached } from "@/server/lib/r2-cache";
import { z } from "zod";

const GADS_CACHE_TTL_SECONDS = 30 * 60; // 30 minutes
const GADS_SHORT_CACHE_TTL = 5 * 60; // 5 minutes for frequently changing data

async function cacheResults(key: string, data: unknown, ttl = GADS_CACHE_TTL_SECONDS) {
  await setCached(key, data, ttl).catch(
    (error: unknown) => {
      console.error("gads.cache-write failed:", error);
    },
  );
}

// ---------------------------------------------------------------------------
// Cache schemas
// ---------------------------------------------------------------------------

const accountSummaryCacheSchema = z.array(
  z.object({
    date: z.string(),
    clicks: z.number(),
    impressions: z.number(),
    costUsd: z.number(),
    conversions: z.number(),
    conversionsValue: z.number(),
    ctr: z.number(),
    avgCpc: z.number(),
  }),
);

const campaignCacheSchema = z.array(
  z.object({
    campaignName: z.string(),
    campaignId: z.string(),
    status: z.string(),
    channelType: z.string(),
    clicks: z.number(),
    impressions: z.number(),
    costUsd: z.number(),
    conversions: z.number(),
    conversionsValue: z.number(),
    ctr: z.number(),
    avgCpc: z.number(),
    date: z.string(),
  }),
);

const searchTermCacheSchema = z.array(
  z.object({
    searchTerm: z.string(),
    campaignName: z.string(),
    adGroupName: z.string(),
    clicks: z.number(),
    impressions: z.number(),
    costUsd: z.number(),
    conversions: z.number(),
    ctr: z.number(),
    cpa: z.number().nullable(),
  }),
);

const keywordCacheSchema = z.array(
  z.object({
    keyword: z.string(),
    matchType: z.string(),
    campaignName: z.string(),
    adGroupName: z.string(),
    qualityScore: z.number().nullable(),
    clicks: z.number(),
    impressions: z.number(),
    costUsd: z.number(),
    conversions: z.number(),
    avgCpc: z.number(),
    cpa: z.number().nullable(),
  }),
);

const adGroupCacheSchema = z.array(
  z.object({
    adGroupId: z.string(),
    adGroupName: z.string(),
    campaignName: z.string(),
    campaignId: z.string(),
    status: z.string(),
    clicks: z.number(),
    impressions: z.number(),
    costUsd: z.number(),
    conversions: z.number(),
    ctr: z.number(),
    avgCpc: z.number(),
    cpa: z.number().nullable(),
  }),
);

const adCacheSchema = z.array(
  z.object({
    adId: z.string(),
    adGroupName: z.string(),
    campaignName: z.string(),
    headlines: z.array(z.string()),
    descriptions: z.array(z.string()),
    status: z.string(),
    adStrength: z.string(),
    clicks: z.number(),
    impressions: z.number(),
    costUsd: z.number(),
    conversions: z.number(),
    ctr: z.number(),
  }),
);

// ---------------------------------------------------------------------------
// Auth check
// ---------------------------------------------------------------------------

export const checkGoogleAdsAuth = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => googleAdsProjectOnlySchema.parse(data))
  .handler(async () => {
    return verifyGoogleAdsAuth();
  });

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

export const getAccountSummary = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => googleAdsDateRangeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const cacheKey = await buildCacheKey("gads:account-summary", {
      organizationId: context.organizationId,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
    });

    const cached = accountSummaryCacheSchema.safeParse(await getCached(cacheKey));
    if (cached.success) return cached.data;

    const results = await fetchAccountSummary(data.dateFrom, data.dateTo);
    await cacheResults(cacheKey, results);
    return results;
  });

export const getCampaignPerformance = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => googleAdsDateRangeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const cacheKey = await buildCacheKey("gads:campaigns", {
      organizationId: context.organizationId,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
    });

    const cached = campaignCacheSchema.safeParse(await getCached(cacheKey));
    if (cached.success) return cached.data;

    const results = await fetchCampaignPerformance(data.dateFrom, data.dateTo);
    await cacheResults(cacheKey, results);
    return results;
  });

export const getSearchTermReport = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => googleAdsSearchTermsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const cacheKey = await buildCacheKey("gads:search-terms", {
      organizationId: context.organizationId,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      limit: data.limit,
    });

    const cached = searchTermCacheSchema.safeParse(await getCached(cacheKey));
    if (cached.success) return cached.data;

    const results = await fetchSearchTermReport(
      data.dateFrom,
      data.dateTo,
      data.limit,
    );
    await cacheResults(cacheKey, results);
    return results;
  });

export const getKeywordPerformance = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => googleAdsKeywordsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const cacheKey = await buildCacheKey("gads:keywords", {
      organizationId: context.organizationId,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      limit: data.limit,
    });

    const cached = keywordCacheSchema.safeParse(await getCached(cacheKey));
    if (cached.success) return cached.data;

    const results = await fetchKeywordPerformance(
      data.dateFrom,
      data.dateTo,
      data.limit,
    );
    await cacheResults(cacheKey, results);
    return results;
  });

export const getAdGroupPerformance = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => googleAdsAdGroupsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const cacheKey = await buildCacheKey("gads:ad-groups", {
      organizationId: context.organizationId,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      limit: data.limit,
    });

    const cached = adGroupCacheSchema.safeParse(await getCached(cacheKey));
    if (cached.success) return cached.data;

    const results = await fetchAdGroupPerformance(
      data.dateFrom,
      data.dateTo,
      data.limit,
    );
    await cacheResults(cacheKey, results);
    return results;
  });

export const getAdPerformance = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => googleAdsAdsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const cacheKey = await buildCacheKey("gads:ads", {
      organizationId: context.organizationId,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      limit: data.limit,
    });

    const cached = adCacheSchema.safeParse(await getCached(cacheKey));
    if (cached.success) return cached.data;

    const results = await fetchAdPerformance(
      data.dateFrom,
      data.dateTo,
      data.limit,
    );
    await cacheResults(cacheKey, results);
    return results;
  });

export const getNegativeKeywords = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => googleAdsProjectOnlySchema.parse(data))
  .handler(async ({ context }) => {
    const cacheKey = await buildCacheKey("gads:negatives", {
      organizationId: context.organizationId,
    });

    // Short cache for negatives since they change with writes
    const cached = z
      .array(z.object({
        criterionId: z.string(),
        keyword: z.string(),
        matchType: z.string(),
        campaignName: z.string(),
        campaignId: z.string(),
        level: z.literal("campaign"),
      }))
      .safeParse(await getCached(cacheKey));
    if (cached.success) return cached.data;

    const results = await fetchNegativeKeywords();
    await cacheResults(cacheKey, results, GADS_SHORT_CACHE_TTL);
    return results;
  });

export const getConversionActions = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => googleAdsProjectOnlySchema.parse(data))
  .handler(async ({ context }) => {
    const cacheKey = await buildCacheKey("gads:conversions", {
      organizationId: context.organizationId,
    });

    const cached = z
      .array(z.object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
        type: z.string(),
        status: z.string(),
        countingType: z.string(),
      }))
      .safeParse(await getCached(cacheKey));
    if (cached.success) return cached.data;

    const results = await fetchConversionActions();
    await cacheResults(cacheKey, results);
    return results;
  });

export const getCampaignBudgets = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => googleAdsProjectOnlySchema.parse(data))
  .handler(async ({ context }) => {
    const cacheKey = await buildCacheKey("gads:budgets", {
      organizationId: context.organizationId,
    });

    const cached = z
      .array(z.object({
        campaignId: z.string(),
        campaignName: z.string(),
        status: z.string(),
        budgetId: z.string(),
        budgetAmountUsd: z.number(),
        budgetDeliveryMethod: z.string(),
      }))
      .safeParse(await getCached(cacheKey));
    if (cached.success) return cached.data;

    const results = await fetchCampaignBudgets();
    await cacheResults(cacheKey, results, GADS_SHORT_CACHE_TTL);
    return results;
  });

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

export const updateCampaignStatus = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => campaignStatusMutationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const oldStatus = data.newStatus === "ENABLED" ? "PAUSED" : "ENABLED";
    await mutateCampaignStatus(data.campaignId, data.newStatus);
    await logGadsChange(context.project.id, {
      action: "campaign_status",
      entityType: "campaign",
      entityId: data.campaignId,
      oldValue: oldStatus,
      newValue: data.newStatus,
      source: "ui",
    });
    return { success: true, campaignId: data.campaignId, newStatus: data.newStatus };
  });

export const updateCampaignBudget = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => campaignBudgetMutationSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutateCampaignBudget(data.budgetId, data.newDailyBudgetUsd);
    await logGadsChange(context.project.id, {
      action: "budget_update",
      entityType: "budget",
      entityId: data.budgetId,
      newValue: `$${data.newDailyBudgetUsd.toFixed(2)}/day`,
      source: "ui",
    });
    return { success: true, budgetId: data.budgetId, newBudget: data.newDailyBudgetUsd };
  });

export const addNegativeKeyword = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => addNegativeKeywordSchema.parse(data))
  .handler(async ({ data, context }) => {
    await mutateAddNegativeKeyword(data.campaignId, data.keywordText, data.matchType);
    await logGadsChange(context.project.id, {
      action: "add_negative",
      entityType: "keyword",
      entityId: data.campaignId,
      entityName: data.keywordText,
      newValue: `[${data.matchType}] ${data.keywordText}`,
      source: "ui",
    });
    return { success: true, keyword: data.keywordText, campaignId: data.campaignId };
  });

// ---------------------------------------------------------------------------
// Change Log
// ---------------------------------------------------------------------------

export const getGadsChanges = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => googleAdsProjectOnlySchema.parse(data))
  .handler(async ({ context }) => {
    return getGadsChangeLog(context.project.id, 100);
  });
