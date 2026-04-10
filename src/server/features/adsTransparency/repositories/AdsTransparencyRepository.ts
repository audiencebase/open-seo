import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedAdvertisers, savedCreatives } from "@/db/schema";

async function saveAdvertiser(params: {
  projectId: string;
  advertiserId: string;
  advertiserName: string | null;
  domain: string | null;
  keyword: string;
  locationCode: number;
  adsCount: number | null;
  verified: boolean | null;
}) {
  const id = crypto.randomUUID();
  await db
    .insert(savedAdvertisers)
    .values({
      id,
      projectId: params.projectId,
      advertiserId: params.advertiserId,
      advertiserName: params.advertiserName,
      domain: params.domain,
      keyword: params.keyword,
      locationCode: params.locationCode,
      adsCount: params.adsCount,
      verified: params.verified,
    })
    .onConflictDoUpdate({
      target: [savedAdvertisers.projectId, savedAdvertisers.advertiserId],
      set: {
        advertiserName: params.advertiserName,
        domain: params.domain,
        keyword: params.keyword,
        locationCode: params.locationCode,
        adsCount: params.adsCount,
        verified: params.verified,
      },
    });
}

async function listSavedAdvertisers(projectId: string) {
  return db
    .select()
    .from(savedAdvertisers)
    .where(eq(savedAdvertisers.projectId, projectId))
    .orderBy(desc(savedAdvertisers.createdAt));
}

async function removeSavedAdvertiser(projectId: string, id: string) {
  await db
    .delete(savedAdvertisers)
    .where(
      and(
        eq(savedAdvertisers.id, id),
        eq(savedAdvertisers.projectId, projectId),
      ),
    );
}

async function saveCreative(params: {
  projectId: string;
  creativeId: string;
  advertiserId: string;
  title: string | null;
  url: string | null;
  format: string | null;
  previewImage: string | null;
  firstShown: string | null;
  lastShown: string | null;
}) {
  const id = crypto.randomUUID();
  await db
    .insert(savedCreatives)
    .values({
      id,
      projectId: params.projectId,
      creativeId: params.creativeId,
      advertiserId: params.advertiserId,
      title: params.title,
      url: params.url,
      format: params.format,
      previewImage: params.previewImage,
      firstShown: params.firstShown,
      lastShown: params.lastShown,
    })
    .onConflictDoUpdate({
      target: [savedCreatives.projectId, savedCreatives.creativeId],
      set: {
        advertiserId: params.advertiserId,
        title: params.title,
        url: params.url,
        format: params.format,
        previewImage: params.previewImage,
        firstShown: params.firstShown,
        lastShown: params.lastShown,
      },
    });
}

async function listSavedCreatives(projectId: string) {
  return db
    .select()
    .from(savedCreatives)
    .where(eq(savedCreatives.projectId, projectId))
    .orderBy(desc(savedCreatives.createdAt));
}

async function removeSavedCreative(projectId: string, id: string) {
  await db
    .delete(savedCreatives)
    .where(
      and(
        eq(savedCreatives.id, id),
        eq(savedCreatives.projectId, projectId),
      ),
    );
}

export const AdsTransparencyRepository = {
  saveAdvertiser,
  listSavedAdvertisers,
  removeSavedAdvertiser,
  saveCreative,
  listSavedCreatives,
  removeSavedCreative,
} as const;
