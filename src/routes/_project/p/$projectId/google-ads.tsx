import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GoogleAdsPage } from "@/client/features/googleAds/GoogleAdsPage";
import { googleAdsSearchParamsSchema } from "@/types/schemas/googleAds";

export const Route = createFileRoute("/_project/p/$projectId/google-ads")({
  validateSearch: googleAdsSearchParamsSchema,
  component: GoogleAdsRoute,
});

function GoogleAdsRoute() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate({ from: Route.fullPath });
  const {
    dateFrom = "",
    dateTo = "",
    tab = "overview",
  } = Route.useSearch();

  return (
    <GoogleAdsPage
      projectId={projectId}
      navigate={navigate}
      searchState={{
        dateFrom,
        dateTo,
        tab,
      }}
    />
  );
}
