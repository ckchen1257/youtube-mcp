import { describe, expect, it } from "vitest";

import { queryItems } from "../src/youtube/query.js";
import type { PlaylistItem, VideoSummary } from "../src/youtube/types.js";

const uploads: VideoSummary[] = [
  {
    addedAt: "2025-01-01T00:00:00Z",
    channelTitle: "My Channel",
    description: "Member archive",
    privacyStatus: "private",
    thumbnailUrl: "https://example.com/a.jpg",
    title: "Members Update",
    videoId: "video-a",
    videoPublishedAt: "2025-01-02T00:00:00Z"
  },
  {
    addedAt: "2025-02-01T00:00:00Z",
    channelTitle: "My Channel",
    description: "Public tutorial",
    privacyStatus: "public",
    thumbnailUrl: "https://example.com/b.jpg",
    title: "Alpha Tutorial",
    videoId: "video-b",
    videoPublishedAt: "2025-02-02T00:00:00Z"
  },
  {
    addedAt: "2025-03-01T00:00:00Z",
    channelTitle: "My Channel",
    description: "Secret roadmap",
    privacyStatus: "private",
    thumbnailUrl: "https://example.com/c.jpg",
    title: "Beta Roadmap",
    videoId: "video-c",
    videoPublishedAt: "2025-03-02T00:00:00Z"
  }
];

const playlistItems: PlaylistItem[] = uploads.map((video, index) => ({
  ...video,
  playlistId: "playlist-1",
  playlistItemId: `item-${index + 1}`,
  position: index
}));

describe("queryItems", () => {
  it("filters uploads by privacy status and query", () => {
    const result = queryItems(uploads, {
      privacyStatus: "private",
      query: "roadmap"
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.videoId).toBe("video-c");
    expect(result.filtersApplied).toEqual({
      privacyStatus: "private",
      query: "roadmap"
    });
    expect(result.isPartial).toBe(false);
  });

  it("sorts playlist items and respects scan limits", () => {
    const result = queryItems(playlistItems, {
      limit: 1,
      maxItemsScanned: 2,
      sortBy: "title",
      sortDirection: "desc"
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("Members Update");
    expect(result.scannedItemCount).toBe(2);
    expect(result.matchedCount).toBe(2);
    expect(result.isPartial).toBe(true);
    expect(result.sort).toEqual({
      direction: "desc",
      field: "title"
    });
  });
});
