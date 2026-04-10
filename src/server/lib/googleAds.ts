import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import { getRequiredEnvValue } from "@/server/lib/runtime-env";

// ---------------------------------------------------------------------------
// OAuth2 token refresh
// ---------------------------------------------------------------------------

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const clientId = await getRequiredEnvValue("GOOGLE_ADS_CLIENT_ID");
  const clientSecret = await getRequiredEnvValue("GOOGLE_ADS_CLIENT_SECRET");
  const refreshToken = await getRequiredEnvValue("GOOGLE_ADS_REFRESH_TOKEN");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(
      "INTERNAL_ERROR",
      `Google OAuth token refresh failed (${response.status}): ${text.slice(0, 500)}`,
    );
  }

  const data: unknown = await response.json();
  const tokenResponse = z
    .object({
      access_token: z.string(),
      expires_in: z.number(),
    })
    .parse(data);
  cachedAccessToken = {
    token: tokenResponse.access_token,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
  };

  return cachedAccessToken.token;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GOOGLE_ADS_API_VERSION = "v19";

async function getCleanCustomerId(): Promise<string> {
  const customerId = await getRequiredEnvValue("GOOGLE_ADS_CUSTOMER_ID");
  return customerId.replace(/-/g, "");
}

async function getCommonHeaders(): Promise<Record<string, string>> {
  const developerToken = await getRequiredEnvValue("GOOGLE_ADS_DEVELOPER_TOKEN");
  const accessToken = await getAccessToken();
  return {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// Auth verification
// ---------------------------------------------------------------------------

export async function verifyGoogleAdsAuth(): Promise<{
  authenticated: boolean;
  customerId: string;
  accountName: string;
  error: string | null;
}> {
  try {
    const cleanCustomerId = await getCleanCustomerId();
    const headers = await getCommonHeaders();

    const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cleanCustomerId}/googleAds:searchStream`;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: `SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1`,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        authenticated: false,
        customerId: cleanCustomerId,
        accountName: "",
        error: `API returned ${response.status}: ${text.slice(0, 300)}`,
      };
    }

    const rawData: unknown = await response.json();
    const batches = Array.isArray(rawData) ? rawData : [];
    const firstResult = batches[0] as
      | { results?: Array<{ customer?: { descriptiveName?: string } }> }
      | undefined;
    const accountName =
      firstResult?.results?.[0]?.customer?.descriptiveName ?? "Unknown";

    return {
      authenticated: true,
      customerId: cleanCustomerId,
      accountName,
      error: null,
    };
  } catch (err) {
    return {
      authenticated: false,
      customerId: "",
      accountName: "",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ---------------------------------------------------------------------------
// GAQL query executor
// ---------------------------------------------------------------------------

export async function executeGaql(
  query: string,
): Promise<unknown[]> {
  const cleanCustomerId = await getCleanCustomerId();
  const headers = await getCommonHeaders();

  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cleanCustomerId}/googleAds:searchStream`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(
      "INTERNAL_ERROR",
      `Google Ads API error (${response.status}): ${text.slice(0, 800)}`,
    );
  }

  const rawData: unknown = await response.json();

  // searchStream returns an array of batches, each with a results array
  if (!Array.isArray(rawData)) return [];

  const batchSchema = z.object({
    results: z.array(z.unknown()),
  });

  const allResults: unknown[] = [];
  for (const batch of rawData) {
    const parsed = batchSchema.safeParse(batch);
    if (parsed.success) {
      allResults.push(...parsed.data.results);
    }
  }

  return allResults;
}

// ---------------------------------------------------------------------------
// Mutation executor (write operations)
// ---------------------------------------------------------------------------

type MutateOperation = Record<string, unknown>;

export async function executeGadsMutation(
  operations: MutateOperation[],
): Promise<unknown> {
  const cleanCustomerId = await getCleanCustomerId();
  const headers = await getCommonHeaders();

  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cleanCustomerId}/googleAds:mutate`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ mutateOperations: operations }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(
      "INTERNAL_ERROR",
      `Google Ads mutation error (${response.status}): ${text.slice(0, 800)}`,
    );
  }

  return response.json();
}

// Resource-specific mutation helper
async function executeSingleResourceMutate(
  resource: string,
  operations: Record<string, unknown>[],
): Promise<unknown> {
  const cleanCustomerId = await getCleanCustomerId();
  const headers = await getCommonHeaders();

  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cleanCustomerId}/${resource}:mutate`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ operations }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(
      "INTERNAL_ERROR",
      `Google Ads ${resource} mutation error (${response.status}): ${text.slice(0, 800)}`,
    );
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Typed query helpers — Read operations
// ---------------------------------------------------------------------------

// Account-level summary (aggregated across all campaigns)
export type AccountSummaryRow = {
  date: string;
  clicks: number;
  impressions: number;
  costUsd: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  avgCpc: number;
};

const accountSummaryRowSchema = z.object({
  metrics: z
    .object({
      clicks: z.string().optional(),
      impressions: z.string().optional(),
      costMicros: z.string().optional(),
      conversions: z.number().optional(),
      conversionsValue: z.number().optional(),
      ctr: z.number().optional(),
      averageCpc: z.number().optional(),
    })
    .optional(),
  segments: z
    .object({
      date: z.string().optional(),
    })
    .optional(),
});

export async function fetchAccountSummary(
  dateFrom: string,
  dateTo: string,
): Promise<AccountSummaryRow[]> {
  const query = `
    SELECT
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc,
      segments.date
    FROM customer
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
    ORDER BY segments.date ASC
  `;

  const results = await executeGaql(query);
  return results.map((row) => {
    const parsed = accountSummaryRowSchema.parse(row);
    return {
      date: parsed.segments?.date ?? "",
      clicks: Number(parsed.metrics?.clicks ?? 0),
      impressions: Number(parsed.metrics?.impressions ?? 0),
      costUsd: Number(parsed.metrics?.costMicros ?? 0) / 1_000_000,
      conversions: parsed.metrics?.conversions ?? 0,
      conversionsValue: parsed.metrics?.conversionsValue ?? 0,
      ctr: parsed.metrics?.ctr ?? 0,
      avgCpc: Number(parsed.metrics?.averageCpc ?? 0) / 1_000_000,
    };
  });
}

// Campaign performance
const campaignRowSchema = z.object({
  campaign: z
    .object({
      name: z.string().optional(),
      id: z.string().optional(),
      status: z.string().optional(),
      advertisingChannelType: z.string().optional(),
    })
    .optional(),
  metrics: z
    .object({
      clicks: z.string().optional(),
      impressions: z.string().optional(),
      costMicros: z.string().optional(),
      conversions: z.number().optional(),
      conversionsValue: z.number().optional(),
      ctr: z.number().optional(),
      averageCpc: z.number().optional(),
    })
    .optional(),
  segments: z
    .object({
      date: z.string().optional(),
    })
    .optional(),
});

export type CampaignRow = {
  campaignName: string;
  campaignId: string;
  status: string;
  channelType: string;
  clicks: number;
  impressions: number;
  costUsd: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  avgCpc: number;
  date: string;
};

export async function fetchCampaignPerformance(
  dateFrom: string,
  dateTo: string,
): Promise<CampaignRow[]> {
  const query = `
    SELECT
      campaign.name,
      campaign.id,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc,
      segments.date
    FROM campaign
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
  `;

  const results = await executeGaql(query);
  return results.map((row) => {
    const parsed = campaignRowSchema.parse(row);
    return {
      campaignName: parsed.campaign?.name ?? "",
      campaignId: parsed.campaign?.id ?? "",
      status: parsed.campaign?.status ?? "",
      channelType: parsed.campaign?.advertisingChannelType ?? "",
      clicks: Number(parsed.metrics?.clicks ?? 0),
      impressions: Number(parsed.metrics?.impressions ?? 0),
      costUsd: Number(parsed.metrics?.costMicros ?? 0) / 1_000_000,
      conversions: parsed.metrics?.conversions ?? 0,
      conversionsValue: parsed.metrics?.conversionsValue ?? 0,
      ctr: parsed.metrics?.ctr ?? 0,
      avgCpc: Number(parsed.metrics?.averageCpc ?? 0) / 1_000_000,
      date: parsed.segments?.date ?? "",
    };
  });
}

// Search term report
const searchTermRowSchema = z.object({
  searchTermView: z
    .object({
      searchTerm: z.string().optional(),
    })
    .optional(),
  campaign: z
    .object({
      name: z.string().optional(),
    })
    .optional(),
  adGroup: z
    .object({
      name: z.string().optional(),
    })
    .optional(),
  metrics: z
    .object({
      clicks: z.string().optional(),
      impressions: z.string().optional(),
      costMicros: z.string().optional(),
      conversions: z.number().optional(),
      ctr: z.number().optional(),
    })
    .optional(),
});

export type SearchTermRow = {
  searchTerm: string;
  campaignName: string;
  adGroupName: string;
  clicks: number;
  impressions: number;
  costUsd: number;
  conversions: number;
  ctr: number;
  cpa: number | null;
};

export async function fetchSearchTermReport(
  dateFrom: string,
  dateTo: string,
  limit: number = 100,
): Promise<SearchTermRow[]> {
  const query = `
    SELECT
      search_term_view.search_term,
      campaign.name,
      ad_group.name,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr
    FROM search_term_view
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
    ORDER BY metrics.impressions DESC
    LIMIT ${limit}
  `;

  const results = await executeGaql(query);
  return results.map((row) => {
    const parsed = searchTermRowSchema.parse(row);
    const costUsd = Number(parsed.metrics?.costMicros ?? 0) / 1_000_000;
    const conversions = parsed.metrics?.conversions ?? 0;
    return {
      searchTerm: parsed.searchTermView?.searchTerm ?? "",
      campaignName: parsed.campaign?.name ?? "",
      adGroupName: parsed.adGroup?.name ?? "",
      clicks: Number(parsed.metrics?.clicks ?? 0),
      impressions: Number(parsed.metrics?.impressions ?? 0),
      costUsd,
      conversions,
      ctr: parsed.metrics?.ctr ?? 0,
      cpa: conversions > 0 ? costUsd / conversions : null,
    };
  });
}

// Keyword performance
const keywordRowSchema = z.object({
  adGroupCriterion: z
    .object({
      keyword: z
        .object({
          text: z.string().optional(),
          matchType: z.string().optional(),
        })
        .optional(),
      qualityInfo: z
        .object({
          qualityScore: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  campaign: z
    .object({
      name: z.string().optional(),
    })
    .optional(),
  adGroup: z
    .object({
      name: z.string().optional(),
    })
    .optional(),
  metrics: z
    .object({
      clicks: z.string().optional(),
      impressions: z.string().optional(),
      costMicros: z.string().optional(),
      conversions: z.number().optional(),
      averageCpc: z.number().optional(),
    })
    .optional(),
});

export type KeywordRow = {
  keyword: string;
  matchType: string;
  campaignName: string;
  adGroupName: string;
  qualityScore: number | null;
  clicks: number;
  impressions: number;
  costUsd: number;
  conversions: number;
  avgCpc: number;
  cpa: number | null;
};

export async function fetchKeywordPerformance(
  dateFrom: string,
  dateTo: string,
  limit: number = 100,
): Promise<KeywordRow[]> {
  const query = `
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.quality_info.quality_score,
      campaign.name,
      ad_group.name,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.average_cpc
    FROM keyword_view
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY metrics.impressions DESC
    LIMIT ${limit}
  `;

  const results = await executeGaql(query);
  return results.map((row) => {
    const parsed = keywordRowSchema.parse(row);
    const costUsd = Number(parsed.metrics?.costMicros ?? 0) / 1_000_000;
    const conversions = parsed.metrics?.conversions ?? 0;
    return {
      keyword: parsed.adGroupCriterion?.keyword?.text ?? "",
      matchType: parsed.adGroupCriterion?.keyword?.matchType ?? "",
      campaignName: parsed.campaign?.name ?? "",
      adGroupName: parsed.adGroup?.name ?? "",
      qualityScore: parsed.adGroupCriterion?.qualityInfo?.qualityScore ?? null,
      clicks: Number(parsed.metrics?.clicks ?? 0),
      impressions: Number(parsed.metrics?.impressions ?? 0),
      costUsd,
      conversions,
      avgCpc: Number(parsed.metrics?.averageCpc ?? 0) / 1_000_000,
      cpa: conversions > 0 ? costUsd / conversions : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Ad Group performance
// ---------------------------------------------------------------------------

export type AdGroupRow = {
  adGroupId: string;
  adGroupName: string;
  campaignName: string;
  campaignId: string;
  status: string;
  clicks: number;
  impressions: number;
  costUsd: number;
  conversions: number;
  ctr: number;
  avgCpc: number;
  cpa: number | null;
};

const adGroupRowSchema = z.object({
  adGroup: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      status: z.string().optional(),
    })
    .optional(),
  campaign: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  metrics: z
    .object({
      clicks: z.string().optional(),
      impressions: z.string().optional(),
      costMicros: z.string().optional(),
      conversions: z.number().optional(),
      ctr: z.number().optional(),
      averageCpc: z.number().optional(),
    })
    .optional(),
});

export async function fetchAdGroupPerformance(
  dateFrom: string,
  dateTo: string,
  limit: number = 100,
): Promise<AdGroupRow[]> {
  const query = `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      campaign.id,
      campaign.name,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM ad_group
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND ad_group.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT ${limit}
  `;

  const results = await executeGaql(query);
  return results.map((row) => {
    const parsed = adGroupRowSchema.parse(row);
    const costUsd = Number(parsed.metrics?.costMicros ?? 0) / 1_000_000;
    const conversions = parsed.metrics?.conversions ?? 0;
    return {
      adGroupId: parsed.adGroup?.id ?? "",
      adGroupName: parsed.adGroup?.name ?? "",
      campaignName: parsed.campaign?.name ?? "",
      campaignId: parsed.campaign?.id ?? "",
      status: parsed.adGroup?.status ?? "",
      clicks: Number(parsed.metrics?.clicks ?? 0),
      impressions: Number(parsed.metrics?.impressions ?? 0),
      costUsd,
      conversions,
      ctr: parsed.metrics?.ctr ?? 0,
      avgCpc: Number(parsed.metrics?.averageCpc ?? 0) / 1_000_000,
      cpa: conversions > 0 ? costUsd / conversions : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Ad copy (RSAs) performance
// ---------------------------------------------------------------------------

export type AdRow = {
  adId: string;
  adGroupName: string;
  campaignName: string;
  headlines: string[];
  descriptions: string[];
  status: string;
  adStrength: string;
  clicks: number;
  impressions: number;
  costUsd: number;
  conversions: number;
  ctr: number;
};

const adRowSchema = z.object({
  adGroupAd: z
    .object({
      ad: z
        .object({
          id: z.string().optional(),
          responsiveSearchAd: z
            .object({
              headlines: z
                .array(z.object({ text: z.string().optional() }))
                .optional(),
              descriptions: z
                .array(z.object({ text: z.string().optional() }))
                .optional(),
            })
            .optional(),
          adStrength: z.string().optional(),
        })
        .optional(),
      status: z.string().optional(),
    })
    .optional(),
  adGroup: z
    .object({
      name: z.string().optional(),
    })
    .optional(),
  campaign: z
    .object({
      name: z.string().optional(),
    })
    .optional(),
  metrics: z
    .object({
      clicks: z.string().optional(),
      impressions: z.string().optional(),
      costMicros: z.string().optional(),
      conversions: z.number().optional(),
      ctr: z.number().optional(),
    })
    .optional(),
});

export async function fetchAdPerformance(
  dateFrom: string,
  dateTo: string,
  limit: number = 50,
): Promise<AdRow[]> {
  const query = `
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.responsive_search_ad.descriptions,
      ad_group_ad.ad.ad_strength,
      ad_group_ad.status,
      ad_group.name,
      campaign.name,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr
    FROM ad_group_ad
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND ad_group_ad.status != 'REMOVED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
    ORDER BY metrics.impressions DESC
    LIMIT ${limit}
  `;

  const results = await executeGaql(query);
  return results.map((row) => {
    const parsed = adRowSchema.parse(row);
    const rsa = parsed.adGroupAd?.ad?.responsiveSearchAd;
    return {
      adId: parsed.adGroupAd?.ad?.id ?? "",
      adGroupName: parsed.adGroup?.name ?? "",
      campaignName: parsed.campaign?.name ?? "",
      headlines: rsa?.headlines?.map((h) => h.text ?? "") ?? [],
      descriptions: rsa?.descriptions?.map((d) => d.text ?? "") ?? [],
      status: parsed.adGroupAd?.status ?? "",
      adStrength: parsed.adGroupAd?.ad?.adStrength ?? "",
      clicks: Number(parsed.metrics?.clicks ?? 0),
      impressions: Number(parsed.metrics?.impressions ?? 0),
      costUsd: Number(parsed.metrics?.costMicros ?? 0) / 1_000_000,
      conversions: parsed.metrics?.conversions ?? 0,
      ctr: parsed.metrics?.ctr ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Negative keywords
// ---------------------------------------------------------------------------

export type NegativeKeywordRow = {
  criterionId: string;
  keyword: string;
  matchType: string;
  campaignName: string;
  campaignId: string;
  level: "campaign";
};

const negativeKeywordRowSchema = z.object({
  campaignCriterion: z
    .object({
      criterionId: z.string().optional(),
      keyword: z
        .object({
          text: z.string().optional(),
          matchType: z.string().optional(),
        })
        .optional(),
      negative: z.boolean().optional(),
    })
    .optional(),
  campaign: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
});

export async function fetchNegativeKeywords(): Promise<NegativeKeywordRow[]> {
  const query = `
    SELECT
      campaign_criterion.criterion_id,
      campaign_criterion.keyword.text,
      campaign_criterion.keyword.match_type,
      campaign_criterion.negative,
      campaign.id,
      campaign.name
    FROM campaign_criterion
    WHERE campaign_criterion.type = 'KEYWORD'
      AND campaign_criterion.negative = TRUE
    ORDER BY campaign.name ASC
    LIMIT 500
  `;

  const results = await executeGaql(query);
  return results.map((row) => {
    const parsed = negativeKeywordRowSchema.parse(row);
    return {
      criterionId: parsed.campaignCriterion?.criterionId ?? "",
      keyword: parsed.campaignCriterion?.keyword?.text ?? "",
      matchType: parsed.campaignCriterion?.keyword?.matchType ?? "",
      campaignName: parsed.campaign?.name ?? "",
      campaignId: parsed.campaign?.id ?? "",
      level: "campaign" as const,
    };
  });
}

// ---------------------------------------------------------------------------
// Conversion actions
// ---------------------------------------------------------------------------

export type ConversionActionRow = {
  id: string;
  name: string;
  category: string;
  type: string;
  status: string;
  countingType: string;
};

const conversionActionSchema = z.object({
  conversionAction: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      category: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      countingType: z.string().optional(),
    })
    .optional(),
});

export async function fetchConversionActions(): Promise<ConversionActionRow[]> {
  const query = `
    SELECT
      conversion_action.id,
      conversion_action.name,
      conversion_action.category,
      conversion_action.type,
      conversion_action.status,
      conversion_action.counting_type
    FROM conversion_action
    WHERE conversion_action.status != 'REMOVED'
    ORDER BY conversion_action.name ASC
  `;

  const results = await executeGaql(query);
  return results.map((row) => {
    const parsed = conversionActionSchema.parse(row);
    return {
      id: parsed.conversionAction?.id ?? "",
      name: parsed.conversionAction?.name ?? "",
      category: parsed.conversionAction?.category ?? "",
      type: parsed.conversionAction?.type ?? "",
      status: parsed.conversionAction?.status ?? "",
      countingType: parsed.conversionAction?.countingType ?? "",
    };
  });
}

// ---------------------------------------------------------------------------
// Campaign budgets
// ---------------------------------------------------------------------------

export type CampaignBudgetRow = {
  campaignId: string;
  campaignName: string;
  status: string;
  budgetId: string;
  budgetAmountUsd: number;
  budgetDeliveryMethod: string;
};

const campaignBudgetRowSchema = z.object({
  campaign: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      status: z.string().optional(),
    })
    .optional(),
  campaignBudget: z
    .object({
      id: z.string().optional(),
      amountMicros: z.string().optional(),
      deliveryMethod: z.string().optional(),
    })
    .optional(),
});

export async function fetchCampaignBudgets(): Promise<CampaignBudgetRow[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign_budget.id,
      campaign_budget.amount_micros,
      campaign_budget.delivery_method
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name ASC
  `;

  const results = await executeGaql(query);
  return results.map((row) => {
    const parsed = campaignBudgetRowSchema.parse(row);
    return {
      campaignId: parsed.campaign?.id ?? "",
      campaignName: parsed.campaign?.name ?? "",
      status: parsed.campaign?.status ?? "",
      budgetId: parsed.campaignBudget?.id ?? "",
      budgetAmountUsd:
        Number(parsed.campaignBudget?.amountMicros ?? 0) / 1_000_000,
      budgetDeliveryMethod: parsed.campaignBudget?.deliveryMethod ?? "",
    };
  });
}

// ---------------------------------------------------------------------------
// Mutation operations (write)
// ---------------------------------------------------------------------------

export async function mutateCampaignStatus(
  campaignId: string,
  newStatus: "ENABLED" | "PAUSED",
): Promise<unknown> {
  const cleanCustomerId = await getCleanCustomerId();
  const resourceName = `customers/${cleanCustomerId}/campaigns/${campaignId}`;

  return executeSingleResourceMutate("campaigns", [
    {
      update: {
        resourceName,
        status: newStatus,
      },
      updateMask: "status",
    },
  ]);
}

export async function mutateCampaignBudget(
  budgetId: string,
  newDailyBudgetUsd: number,
): Promise<unknown> {
  const cleanCustomerId = await getCleanCustomerId();
  const resourceName = `customers/${cleanCustomerId}/campaignBudgets/${budgetId}`;
  const amountMicros = Math.round(newDailyBudgetUsd * 1_000_000).toString();

  return executeSingleResourceMutate("campaignBudgets", [
    {
      update: {
        resourceName,
        amountMicros,
      },
      updateMask: "amount_micros",
    },
  ]);
}

export async function mutateAddNegativeKeyword(
  campaignId: string,
  keywordText: string,
  matchType: "BROAD" | "PHRASE" | "EXACT" = "EXACT",
): Promise<unknown> {
  const cleanCustomerId = await getCleanCustomerId();
  const campaignResourceName = `customers/${cleanCustomerId}/campaigns/${campaignId}`;

  return executeSingleResourceMutate("campaignCriteria", [
    {
      create: {
        campaign: campaignResourceName,
        negative: true,
        keyword: {
          text: keywordText,
          matchType,
        },
      },
    },
  ]);
}

export async function mutateKeywordBid(
  adGroupId: string,
  criterionId: string,
  newCpcBidUsd: number,
): Promise<unknown> {
  const cleanCustomerId = await getCleanCustomerId();
  const resourceName = `customers/${cleanCustomerId}/adGroupCriteria/${adGroupId}~${criterionId}`;
  const cpcBidMicros = Math.round(newCpcBidUsd * 1_000_000).toString();

  return executeSingleResourceMutate("adGroupCriteria", [
    {
      update: {
        resourceName,
        cpcBidMicros,
      },
      updateMask: "cpc_bid_micros",
    },
  ]);
}
