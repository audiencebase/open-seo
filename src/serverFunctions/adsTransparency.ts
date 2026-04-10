import { createServerFn } from "@tanstack/react-start";
import { AdsTransparencyService } from "@/server/features/adsTransparency/services/AdsTransparencyService";
import {
  requireProjectContext,
} from "@/serverFunctions/middleware";
import {
  searchAdvertisersInputSchema,
  searchAdsInputSchema,
  saveAdvertiserInputSchema,
  removeAdvertiserInputSchema,
  saveCreativeInputSchema,
  removeCreativeInputSchema,
  getSavedInputSchema,
} from "@/types/schemas/adsTransparency";

export const searchAdvertisers = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => searchAdvertisersInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AdsTransparencyService.searchAdvertisers(
      {
        keyword: data.keyword,
        locationCode: data.locationCode,
      },
      {
        organizationId: context.organizationId,
        userEmail: context.userEmail,
      },
    );
  });

export const searchAds = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => searchAdsInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AdsTransparencyService.searchAds(
      {
        advertiserIds: data.advertiserIds,
        target: data.target,
        locationCode: data.locationCode,
        platform: data.platform,
        format: data.format,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
      },
      {
        organizationId: context.organizationId,
        userEmail: context.userEmail,
      },
    );
  });

export const saveAdvertiser = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => saveAdvertiserInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await AdsTransparencyService.saveAdvertiser({
      projectId: context.project.id,
      advertiserId: data.advertiserId,
      advertiserName: data.advertiserName ?? null,
      domain: data.domain ?? null,
      keyword: data.keyword,
      locationCode: data.locationCode,
      adsCount: data.adsCount ?? null,
      verified: data.verified ?? null,
    });
    return { success: true };
  });

export const getSavedAdvertisers = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => getSavedInputSchema.parse(data))
  .handler(async ({ context }) => {
    return AdsTransparencyService.listSavedAdvertisers(context.project.id);
  });

export const removeSavedAdvertiser = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => removeAdvertiserInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await AdsTransparencyService.removeSavedAdvertiser(
      context.project.id,
      data.id,
    );
    return { success: true };
  });

export const saveCreative = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => saveCreativeInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await AdsTransparencyService.saveCreative({
      projectId: context.project.id,
      creativeId: data.creativeId,
      advertiserId: data.advertiserId,
      title: data.title ?? null,
      url: data.url ?? null,
      format: data.format ?? null,
      previewImage: data.previewImage ?? null,
      firstShown: data.firstShown ?? null,
      lastShown: data.lastShown ?? null,
    });
    return { success: true };
  });

export const getSavedCreatives = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => getSavedInputSchema.parse(data))
  .handler(async ({ context }) => {
    return AdsTransparencyService.listSavedCreatives(context.project.id);
  });

export const removeSavedCreative = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => removeCreativeInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await AdsTransparencyService.removeSavedCreative(
      context.project.id,
      data.id,
    );
    return { success: true };
  });
