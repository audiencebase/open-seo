import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdsTransparencyPage } from "@/client/features/adsTransparency/AdsTransparencyPage";
import { adsSearchParamsSchema } from "@/types/schemas/adsTransparency";

export const Route = createFileRoute("/_project/p/$projectId/ads")({
  validateSearch: adsSearchParamsSchema,
  component: AdsRoute,
});

function AdsRoute() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate({ from: Route.fullPath });
  const {
    q = "",
    mode = "keyword",
    loc = 2840,
    tab = "advertisers",
    advIds = "",
    platform = "",
    format = "",
    dateFrom = "",
    dateTo = "",
  } = Route.useSearch();

  return (
    <AdsTransparencyPage
      projectId={projectId}
      navigate={navigate}
      searchState={{
        q,
        mode,
        loc,
        tab,
        advIds,
        platform,
        format,
        dateFrom,
        dateTo,
      }}
    />
  );
}
