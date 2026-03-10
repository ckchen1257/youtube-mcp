import type { PlaylistItem, QueryParams, QueryResult, SortField, VideoSummary } from "./types.js";

type QueryableItem = PlaylistItem | VideoSummary;

function toFiltersApplied(params: QueryParams): Record<string, string | number> {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as Record<string, string | number>;
}

function getSortValue(item: QueryableItem, sortBy: SortField): number | string {
  switch (sortBy) {
    case "addedAt":
      return item.addedAt ?? "";
    case "title":
      return item.title.toLowerCase();
    case "videoPublishedAt":
      return item.videoPublishedAt ?? "";
    case "playlistPosition":
      return "position" in item ? item.position : Number.MAX_SAFE_INTEGER;
  }
}

function matchesQuery(item: QueryableItem, query: string): boolean {
  const haystack = [item.title, item.description, item.channelTitle]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export function queryItems<T extends QueryableItem>(items: T[], params: QueryParams): QueryResult<T> {
  const scanLimit = params.maxItemsScanned ?? items.length;
  const scannedItems = items.slice(0, scanLimit);

  const filtered = scannedItems.filter(item => {
    if (params.query && !matchesQuery(item, params.query)) {
      return false;
    }

    if (params.videoId && item.videoId !== params.videoId) {
      return false;
    }

    if (params.channelTitle && item.channelTitle !== params.channelTitle) {
      return false;
    }

    if (params.privacyStatus && item.privacyStatus !== params.privacyStatus) {
      return false;
    }

    return true;
  });

  const sortBy = params.sortBy ?? "playlistPosition";
  const sortDirection = params.sortDirection ?? "asc";

  const sorted = [...filtered].sort((left, right) => {
    const leftValue = getSortValue(left, sortBy);
    const rightValue = getSortValue(right, sortBy);

    if (leftValue === rightValue) {
      return 0;
    }

    const comparison = leftValue > rightValue ? 1 : -1;
    return sortDirection === "asc" ? comparison : comparison * -1;
  });

  const limited = params.limit ? sorted.slice(0, params.limit) : sorted;

  return {
    filtersApplied: toFiltersApplied(params),
    isPartial: scannedItems.length < items.length,
    items: limited,
    matchedCount: filtered.length,
    scannedItemCount: scannedItems.length,
    sort: {
      direction: sortDirection,
      field: sortBy
    }
  };
}
