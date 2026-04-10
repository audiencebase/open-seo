import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import type {
  DataforseoApiCallCost,
  DataforseoApiResponse,
} from "@/server/lib/dataforseoCost";
import { getRequiredEnvValue } from "@/server/lib/runtime-env";

// ---------------------------------------------------------------------------
// Zod schemas for DataForSEO Ads Transparency responses
// ---------------------------------------------------------------------------

const taskSchema = z
  .object({
    status_code: z.number().optional(),
    status_message: z.string().optional(),
    cost: z.number().nullable().optional(),
    result_count: z.number().nullable().optional(),
    path: z.array(z.string()).optional(),
    result: z.array(z.unknown()).nullable().optional(),
  })
  .passthrough();

const responseSchema = z
  .object({
    status_code: z.number().optional(),
    status_message: z.string().optional(),
    cost: z.number().nullable().optional(),
    tasks: z.array(taskSchema).optional(),
  })
  .passthrough();

const childAdvertiserSchema = z
  .object({
    type: z.string().optional(),
    advertiser_id: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    verified: z.boolean().nullable().optional(),
    approx_ads_count: z.number().nullable().optional(),
  })
  .passthrough();

export const adsAdvertiserItemSchema = z
  .object({
    type: z.string().optional(),
    rank_group: z.number().nullable().optional(),
    rank_absolute: z.number().nullable().optional(),
    title: z.string().nullable().optional(),
    advertiser_id: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    verified: z.boolean().nullable().optional(),
    approx_ads_count: z.number().nullable().optional(),
    domain: z.string().nullable().optional(),
    advertisers: z.array(childAdvertiserSchema).nullable().optional(),
  })
  .passthrough();

export type AdsAdvertiserItem = z.infer<typeof adsAdvertiserItemSchema>;

const previewImageSchema = z
  .object({
    url: z.string().nullable().optional(),
    height: z.number().nullable().optional(),
    width: z.number().nullable().optional(),
  })
  .passthrough();

export const adsCreativeItemSchema = z
  .object({
    type: z.string().optional(),
    rank_group: z.number().nullable().optional(),
    rank_absolute: z.number().nullable().optional(),
    advertiser_id: z.string().nullable().optional(),
    creative_id: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    verified: z.boolean().nullable().optional(),
    format: z.string().nullable().optional(),
    preview_image: previewImageSchema.nullable().optional(),
    preview_url: z.string().nullable().optional(),
    first_shown: z.string().nullable().optional(),
    last_shown: z.string().nullable().optional(),
  })
  .passthrough();

export type AdsCreativeItem = z.infer<typeof adsCreativeItemSchema>;

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

const resultItemsSchema = z.object({
  items: z.array(z.unknown()).nullable().optional(),
  items_count: z.number().nullable().optional(),
});

function parseItems<T extends z.ZodTypeAny>(
  endpointName: string,
  results: unknown[],
  itemSchema: T,
): Array<z.infer<T>> {
  const firstResult = results[0] ?? null;
  if (firstResult == null) {
    return [];
  }

  const parsedHolder = resultItemsSchema.safeParse(firstResult);
  const items = parsedHolder.success
    ? (parsedHolder.data.items ?? [])
    : [];
  const parsed = z.array(itemSchema).safeParse(items);
  if (!parsed.success) {
    console.error(
      `dataforseo.${endpointName}.invalid-items`,
      parsed.error.issues.slice(0, 5),
    );
    throw new AppError(
      "INTERNAL_ERROR",
      `DataForSEO ${endpointName} returned an invalid response shape`,
    );
  }

  return parsed.data;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

const API_BASE = "https://api.dataforseo.com";

type DataforseoTaskResponse = {
  results: unknown[];
  billing: DataforseoApiCallCost;
};

async function postAdsTransparency(
  path: string,
  payload: unknown,
): Promise<DataforseoTaskResponse> {
  const apiKey = await getRequiredEnvValue("DATAFORSEO_API_KEY");

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new AppError(
      "INTERNAL_ERROR",
      `DataForSEO HTTP ${response.status} on ${path}`,
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    throw new AppError(
      "INTERNAL_ERROR",
      `DataForSEO ${path} returned a non-JSON response`,
    );
  }

  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(
      "INTERNAL_ERROR",
      `DataForSEO ${path} returned an invalid response shape`,
    );
  }

  const responseData = parsed.data;
  if (responseData.status_code !== 20000) {
    throw new AppError(
      "INTERNAL_ERROR",
      responseData.status_message || "DataForSEO request failed",
    );
  }

  const task = responseData.tasks?.[0];
  if (!task) {
    throw new AppError("INTERNAL_ERROR", "DataForSEO response missing task");
  }

  if (task.status_code !== 20000) {
    throw new AppError(
      "INTERNAL_ERROR",
      task.status_message || "DataForSEO task failed",
    );
  }

  return {
    results: task.result ?? [],
    billing: {
      path: task.path ?? [],
      costUsd: task.cost ?? responseData.cost ?? 0,
      resultCount: task.result_count ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

export type AdsAdvertisersInput = {
  keyword: string;
  locationCode: number;
};

export async function fetchAdsAdvertisersRaw(
  input: AdsAdvertisersInput,
): Promise<DataforseoApiResponse<AdsAdvertiserItem[]>> {
  const response = await postAdsTransparency(
    "/v3/serp/google/ads_advertisers/live/advanced",
    [
      {
        keyword: input.keyword,
        location_code: input.locationCode,
      },
    ],
  );
  const data = parseItems(
    "ads-advertisers-live",
    response.results,
    adsAdvertiserItemSchema,
  );
  return { data, billing: response.billing };
}

export type AdsSearchInput = {
  advertiserIds?: string[];
  target?: string;
  locationCode?: number;
  platform?: string;
  format?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function fetchAdsSearchRaw(
  input: AdsSearchInput,
): Promise<DataforseoApiResponse<AdsCreativeItem[]>> {
  const payload: Record<string, unknown> = {};

  if (input.advertiserIds && input.advertiserIds.length > 0) {
    payload.advertiser_ids = input.advertiserIds;
  } else if (input.target) {
    payload.target = input.target;
  }

  if (input.locationCode) {
    payload.location_code = input.locationCode;
  }
  if (input.platform && input.platform !== "all") {
    payload.platform = input.platform;
  }
  if (input.format && input.format !== "all") {
    payload.format = input.format;
  }
  if (input.dateFrom && input.dateTo) {
    payload.date_from = input.dateFrom;
    payload.date_to = input.dateTo;
  }

  const response = await postAdsTransparency(
    "/v3/serp/google/ads_search/live/advanced",
    [payload],
  );
  const data = parseItems(
    "ads-search-live",
    response.results,
    adsCreativeItemSchema,
  );
  return { data, billing: response.billing };
}
