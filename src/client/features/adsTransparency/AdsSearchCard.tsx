import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Search } from "lucide-react";
import type { AdsSearchState } from "./adsTransparencyTypes";

type SearchDraft = {
  q: string;
  mode: AdsSearchState["mode"];
  loc: number;
  platform: string;
  format: string;
  dateFrom: string;
  dateTo: string;
};

export function AdsSearchCard({
  errorMessage,
  initialValues,
  isFetching,
  onSubmit,
}: {
  errorMessage: string | null;
  initialValues: SearchDraft;
  isFetching: boolean;
  onSubmit: (values: SearchDraft) => void;
}) {
  const [showFilters, setShowFilters] = useState(false);
  const form = useForm({
    defaultValues: initialValues,
    validators: {
      onSubmit: ({ value }) => {
        if (!value.q.trim()) {
          return {
            fields: {
              q: value.mode === "keyword"
                ? "Enter a keyword to search."
                : "Enter a domain to search.",
            },
          };
        }
        return null;
      },
    },
    onSubmit: ({ value }) => {
      onSubmit({ ...value, q: value.q.trim() });
    },
  });

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-4">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          {/* Mode toggle */}
          <div className="flex items-center gap-1">
            <form.Field name="mode">
              {(field) => (
                <>
                  <button
                    type="button"
                    className={`btn btn-xs ${field.state.value === "keyword" ? "btn-soft" : "btn-ghost"}`}
                    onClick={() => field.handleChange("keyword")}
                  >
                    By Keyword
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs ${field.state.value === "domain" ? "btn-soft" : "btn-ghost"}`}
                    onClick={() => field.handleChange("domain")}
                  >
                    By Domain
                  </button>
                </>
              )}
            </form.Field>
          </div>

          {/* Search input + submit */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <form.Field name="q">
              {(field) => (
                <label className="input input-bordered lg:col-span-10 flex items-center gap-2">
                  <Search className="size-4 text-base-content/60" />
                  <form.Subscribe selector={(s) => s.values.mode}>
                    {(mode) => (
                      <input
                        className="grow"
                        placeholder={
                          mode === "keyword"
                            ? 'Enter a keyword (e.g., "we buy houses")'
                            : "Enter a domain (e.g., opendoor.com)"
                        }
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                    )}
                  </form.Subscribe>
                </label>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <button
                  type="submit"
                  className="btn btn-primary lg:col-span-2"
                  disabled={isFetching || isSubmitting}
                >
                  {isFetching || isSubmitting ? "Searching..." : "Search"}
                </button>
              )}
            </form.Subscribe>
          </div>

          {/* Filter toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowFilters((c) => !c)}
            >
              {showFilters ? "Hide filters" : "Show filters"}
            </button>
          </div>

          {/* Advanced filters */}
          {showFilters ? (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-base-300 bg-base-200/40 p-4 text-sm md:grid-cols-3">
              <form.Field name="platform">
                {(field) => (
                  <label className="form-control">
                    <span className="label-text mb-1">Platform</span>
                    <select
                      className="select select-bordered select-sm"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    >
                      <option value="">All platforms</option>
                      <option value="google_search">Google Search</option>
                      <option value="youtube">YouTube</option>
                      <option value="google_maps">Google Maps</option>
                      <option value="google_shopping">Google Shopping</option>
                      <option value="google_play">Google Play</option>
                    </select>
                  </label>
                )}
              </form.Field>

              <form.Field name="format">
                {(field) => (
                  <label className="form-control">
                    <span className="label-text mb-1">Format</span>
                    <select
                      className="select select-bordered select-sm"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    >
                      <option value="">All formats</option>
                      <option value="text">Text</option>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </label>
                )}
              </form.Field>

              <form.Field name="dateFrom">
                {(fieldFrom) => (
                  <form.Field name="dateTo">
                    {(fieldTo) => (
                      <label className="form-control">
                        <span className="label-text mb-1">Date range</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            className="input input-bordered input-sm flex-1"
                            value={fieldFrom.state.value}
                            onChange={(e) =>
                              fieldFrom.handleChange(e.target.value)
                            }
                          />
                          <span className="text-base-content/50">to</span>
                          <input
                            type="date"
                            className="input input-bordered input-sm flex-1"
                            value={fieldTo.state.value}
                            onChange={(e) =>
                              fieldTo.handleChange(e.target.value)
                            }
                          />
                        </div>
                      </label>
                    )}
                  </form.Field>
                )}
              </form.Field>
            </div>
          ) : null}
        </form>

        {errorMessage ? (
          <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
