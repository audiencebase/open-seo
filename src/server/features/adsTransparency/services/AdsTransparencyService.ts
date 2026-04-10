import { buildCacheKey, getCached, setCached } from "@/server/lib/r2-cache";
import { createDataforseoClient } from "@/server/lib/dataforseoClient";
import { AdsTransparencyRepository } from "@/server/features/adsTransparency/repositories/AdsTransparencyRepository";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import type {
  AdsAdvertiserItem,
  AdsCreativeItem,
} from "@/server/lib/dataforseoAdsTransparency";
import { z } from "zod";

const ADS_CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours

// ---------------------------------------------------------------------------
// Mapped output types
// ---------------------------------------------------------------------------

export type AdvertiserResult = {
  type: string;
  advertiserId: string | null;
  advertiserName: string | null;
  location: string | null;
  verified: boolean | null;
  adsCount: number | null;
  domain: string | null;
  childAdvertisers: Array<{
    advertiserId: string | null;
    location: string | null;
    verified: boolean | null;
    adsCount: number | null;
  }>;
};

export type CreativeResult = {
  advertiserId: string | null;
  creativeId: string | null;
  title: string | null;
  url: string | null;
  verified: boolean | null;
  format: string | null;
  previewImageUrl: string | null;
  previewImageWidth: number | null;
  previewImageHeight: number | null;
  firstShown: string | null;
  lastShown: string | null;
};

// ---------------------------------------------------------------------------
// Cache validation schemas
// ---------------------------------------------------------------------------

const advertiserResultSchema = z.object({
  type: z.string(),
  advertiserId: z.string().nullable(),
  advertiserName: z.string().nullable(),
  location: z.string().nullable(),
  verified: z.boolean().nullable(),
  adsCount: z.number().nullable(),
  domain: z.string().nullable(),
  childAdvertisers: z.array(
    z.object({
      advertiserId: z.string().nullable(),
      location: z.string().nullable(),
      verified: z.boolean().nullable(),
      adsCount: z.number().nullable(),
    }),
  ),
});

const creativeResultSchema = z.object({
  advertiserId: z.string().nullable(),
  creativeId: z.string().nullable(),
  title: z.string().nullable(),
  url: z.string().nullable(),
  verified: z.boolean().nullable(),
  format: z.string().nullable(),
  previewImageUrl: z.string().nullable(),
  previewImageWidth: z.number().nullable(),
  previewImageHeight: z.number().nullable(),
  firstShown: z.string().nullable(),
  lastShown: z.string().nullable(),
});

const advertisersCacheSchema = z.object({
  advertisers: z.array(advertiserResultSchema),
});

const creativesCacheSchema = z.object({
  creatives: z.array(creativeResultSchema),
});

// ---------------------------------------------------------------------------
// Mapping functions
// ---------------------------------------------------------------------------

function mapAdvertiserItem(item: AdsAdvertiserItem): AdvertiserResult {
  return {
    type: item.type ?? "unknown",
    advertiserId: item.advertiser_id ?? null,
    advertiserName: item.title ?? null,
    location: item.location ?? null,
    verified: item.verified ?? null,
    adsCount: item.approx_ads_count ?? null,
    domain: item.domain ?? null,
    childAdvertisers: (item.advertisers ?? []).map((child) => ({
      advertiserId: child.advertiser_id ?? null,
      location: child.location ?? null,
      verified: child.verified ?? null,
      adsCount: child.approx_ads_count ?? null,
    })),
  };
}

function mapCreativeItem(item: AdsCreativeItem): CreativeResult {
  return {
    advertiserId: item.advertiser_id ?? null,
    creativeId: item.creative_id ?? null,
    title: item.title ?? null,
    url: item.url ?? null,
    verified: item.verified ?? null,
    format: item.format ?? null,
    previewImageUrl: item.preview_image?.url ?? null,
    previewImageWidth: item.preview_image?.width ?? null,
    previewImageHeight: item.preview_image?.height ?? null,
    firstShown: item.first_shown ?? null,
    lastShown: item.last_shown ?? null,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

async function searchAdvertisers(
  input: { keyword: string; locationCode: number },
  billingCustomer: BillingCustomerContext,
): Promise<AdvertiserResult[]> {
  const cacheKey = await buildCacheKey("ads:advertisers", {
    organizationId: billingCustomer.organizationId,
    keyword: input.keyword.toLowerCase().trim(),
    locationCode: input.locationCode,
  });

  const cachedRaw = await getCached(cacheKey);
  const cached = advertisersCacheSchema.safeParse(cachedRaw);
  if (cached.success) {
    return cached.data.advertisers;
  }

  const dataforseo = createDataforseoClient(billingCustomer);
  const items = await dataforseo.adsTransparency.advertisers(input);
  const advertisers = items.map(mapAdvertiserItem);

  await setCached(cacheKey, { advertisers }, ADS_CACHE_TTL_SECONDS).catch(
    (error: unknown) => {
      console.error("ads-transparency.cache-write failed:", error);
    },
  );

  return advertisers;
}

async function searchAds(
  input: {
    advertiserIds?: string[];
    target?: string;
    locationCode?: number;
    platform?: string;
    format?: string;
    dateFrom?: string;
    dateTo?: string;
  },
  billingCustomer: BillingCustomerContext,
): Promise<CreativeResult[]> {
  const cacheKey = await buildCacheKey("ads:search", {
    organizationId: billingCustomer.organizationId,
    advertiserIds: input.advertiserIds?.toSorted().join(",") ?? "",
    target: input.target ?? "",
    locationCode: input.locationCode ?? 0,
    platform: input.platform ?? "all",
    format: input.format ?? "all",
    dateFrom: input.dateFrom ?? "",
    dateTo: input.dateTo ?? "",
  });

  const cachedRaw = await getCached(cacheKey);
  const cached = creativesCacheSchema.safeParse(cachedRaw);
  if (cached.success) {
    return cached.data.creatives;
  }

  const dataforseo = createDataforseoClient(billingCustomer);
  const items = await dataforseo.adsTransparency.adsSearch(input);
  const creatives = items.map(mapCreativeItem);

  await setCached(cacheKey, { creatives }, ADS_CACHE_TTL_SECONDS).catch(
    (error: unknown) => {
      console.error("ads-transparency.cache-write failed:", error);
    },
  );

  return creatives;
}

export const AdsTransparencyService = {
  searchAdvertisers,
  searchAds,
  saveAdvertiser: AdsTransparencyRepository.saveAdvertiser,
  listSavedAdvertisers: AdsTransparencyRepository.listSavedAdvertisers,
  removeSavedAdvertiser: AdsTransparencyRepository.removeSavedAdvertiser,
  saveCreative: AdsTransparencyRepository.saveCreative,
  listSavedCreatives: AdsTransparencyRepository.listSavedCreatives,
  removeSavedCreative: AdsTransparencyRepository.removeSavedCreative,
} as const;
