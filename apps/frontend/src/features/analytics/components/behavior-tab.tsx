import { useSuspenseQuery } from "@tanstack/react-query";
import type { Period, BehaviorAnalytics } from "~/types/api";
import { behaviorAnalyticsQueryOptions } from "../queries";
import { num } from "../utils";
import { RankedBarList } from "./ranked-bar-list";

export function BehaviorTab({ period }: { period: Period }) {
  const data: BehaviorAnalytics = useSuspenseQuery(
    behaviorAnalyticsQueryOptions(period),
  ).data;

  const empty =
    data.topPages.length === 0 &&
    data.topClicks.length === 0 &&
    data.forms.length === 0;

  return (
    <div className="space-y-4">
      {empty ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No on-site behavior yet for this period. Page views populate
          automatically once the tracker is embedded; clicks and form
          submissions require opt-in autocapture (<code>data-autocapture</code>)
          or per-element <code>data-ca-event</code>.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankedBarList
          title="Top pages"
          description="Views and unique visitors"
          emptyLabel="No page views for this period"
          items={data.topPages.map((p) => ({
            label: p.path,
            sublabel: `${num(p.visitors)} visitors`,
            value: num(p.views),
            weight: p.views,
          }))}
        />
        <RankedBarList
          title="Landing pages"
          description="First page of each session"
          emptyLabel="No entry pages for this period"
          items={data.entryPages.map((p) => ({
            label: p.path,
            value: num(p.sessions),
            weight: p.sessions,
          }))}
        />
        <RankedBarList
          title="Top clicks"
          description="Tracked element clicks (opt-in)"
          emptyLabel="No click events — enable click autocapture to populate"
          items={data.topClicks.map((c) => ({
            label: c.label,
            value: num(c.count),
            weight: c.count,
          }))}
        />
        <RankedBarList
          title="Form submissions"
          description="Submissions by form"
          emptyLabel="No form submissions for this period"
          items={data.forms.map((f) => ({
            label: f.name,
            value: num(f.submissions),
            weight: f.submissions,
          }))}
        />
      </div>
    </div>
  );
}
