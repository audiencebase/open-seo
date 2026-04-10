import type { AdsSearchMode, AdsTab } from "@/types/schemas/adsTransparency";
import type {
  searchAdvertisers,
  searchAds,
  getSavedAdvertisers,
  getSavedCreatives,
} from "@/serverFunctions/adsTransparency";

export type AdvertiserData = Awaited<ReturnType<typeof searchAdvertisers>>;
export type CreativeData = Awaited<ReturnType<typeof searchAds>>;
export type SavedAdvertiserData = Awaited<
  ReturnType<typeof getSavedAdvertisers>
>;
export type SavedCreativeData = Awaited<ReturnType<typeof getSavedCreatives>>;

export type AdsSearchState = {
  q: string;
  mode: AdsSearchMode;
  loc: number;
  tab: AdsTab;
  advIds: string;
  platform: string;
  format: string;
  dateFrom: string;
  dateTo: string;
};

export type AdsNavigate = (args: {
  search: (prev: Record<string, unknown>) => Record<string, unknown>;
  replace: boolean;
}) => void;

export type AdsTransparencyPageProps = {
  projectId: string;
  searchState: AdsSearchState;
  navigate: AdsNavigate;
};
