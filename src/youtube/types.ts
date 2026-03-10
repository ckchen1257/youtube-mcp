export type PrivacyStatus = "private" | "public" | "unlisted";
export type SortDirection = "asc" | "desc";
export type SortField = "playlistPosition" | "addedAt" | "title" | "videoPublishedAt";

export interface VideoSummary {
  addedAt?: string;
  channelTitle?: string;
  description: string;
  privacyStatus?: string;
  thumbnailUrl?: string;
  title: string;
  videoId: string;
  videoPublishedAt?: string;
}

export interface VideoDetail extends VideoSummary {
  duration?: string;
}

export interface PlaylistSummary {
  channelTitle?: string;
  description: string;
  itemCount?: number;
  playlistId: string;
  privacyStatus?: string;
  publishedAt?: string;
  title: string;
}

export interface PlaylistDetail extends PlaylistSummary {}

export interface PlaylistItem extends VideoSummary {
  playlistId: string;
  playlistItemId: string;
  position: number;
}

export interface QueryParams {
  channelTitle?: string;
  limit?: number;
  maxItemsScanned?: number;
  privacyStatus?: string;
  query?: string;
  sortBy?: SortField;
  sortDirection?: SortDirection;
  videoId?: string;
}

export interface QueryResult<T> {
  filtersApplied: Record<string, string | number>;
  isPartial: boolean;
  items: T[];
  matchedCount: number;
  scannedItemCount: number;
  sort: {
    direction: SortDirection;
    field: SortField;
  };
}

export interface PagedResult<T> {
  items: T[];
  nextPageToken?: string;
  prevPageToken?: string;
}

export interface YouTubeServiceApi {
  findMyUploads(params: QueryParams): Promise<QueryResult<VideoSummary>>;
  findPlaylistItems(params: QueryParams & { playlistId: string }): Promise<QueryResult<PlaylistItem>>;
  getPlaylistById(playlistId: string): Promise<PlaylistDetail>;
  getVideoById(videoId: string): Promise<VideoDetail>;
  listMyUploads(params: Pick<QueryParams, "privacyStatus" | "query"> & { pageSize?: number; pageToken?: string }): Promise<PagedResult<VideoSummary>>;
  listPlaylistItems(params: { pageSize?: number; pageToken?: string; playlistId: string }): Promise<PagedResult<PlaylistItem>>;
}
