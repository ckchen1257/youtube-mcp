import type { youtube_v3 } from "googleapis";

import { AppError, normalizeYouTubeError } from "./errors.js";
import { queryItems } from "./query.js";
import type {
  PagedResult,
  PlaylistDetail,
  PlaylistItem,
  PlaylistSummary,
  QueryParams,
  QueryResult,
  VideoDetail,
  VideoSummary,
  YouTubeServiceApi
} from "./types.js";

type YouTubeResponse<T> = Promise<{ data: T }>;

export interface YouTubeApiLike {
  channels: {
    list(params: youtube_v3.Params$Resource$Channels$List): YouTubeResponse<youtube_v3.Schema$ChannelListResponse>;
  };
  playlistItems: {
    list(params: youtube_v3.Params$Resource$Playlistitems$List): YouTubeResponse<youtube_v3.Schema$PlaylistItemListResponse>;
  };
  playlists: {
    list(params: youtube_v3.Params$Resource$Playlists$List): YouTubeResponse<youtube_v3.Schema$PlaylistListResponse>;
  };
  videos: {
    list(params: youtube_v3.Params$Resource$Videos$List): YouTubeResponse<youtube_v3.Schema$VideoListResponse>;
  };
}

function pickThumbnailUrl(thumbnails?: youtube_v3.Schema$ThumbnailDetails): string | undefined {
  return (
    thumbnails?.maxres?.url ??
    thumbnails?.standard?.url ??
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url ??
    undefined
  );
}

function mapPlaylistItem(item: youtube_v3.Schema$PlaylistItem): PlaylistItem {
  const videoId = item.contentDetails?.videoId;
  const playlistId = item.snippet?.playlistId;
  const playlistItemId = item.id;

  if (!videoId || !playlistId || !playlistItemId) {
    throw new AppError("youtube_invalid_playlist_item", "Received an incomplete playlist item from YouTube");
  }

  return {
    addedAt: item.snippet?.publishedAt ?? undefined,
    channelTitle: item.snippet?.channelTitle ?? undefined,
    description: item.snippet?.description ?? "",
    playlistId,
    playlistItemId,
    position: item.snippet?.position ?? 0,
    privacyStatus: item.status?.privacyStatus ?? undefined,
    thumbnailUrl: pickThumbnailUrl(item.snippet?.thumbnails),
    title: item.snippet?.title ?? "(untitled video)",
    videoId,
    videoPublishedAt: item.contentDetails?.videoPublishedAt ?? undefined
  };
}

function mapVideo(video: youtube_v3.Schema$Video): VideoDetail {
  const videoId = video.id;

  if (!videoId) {
    throw new AppError("youtube_invalid_video", "Received an incomplete video from YouTube");
  }

  return {
    addedAt: video.snippet?.publishedAt ?? undefined,
    channelTitle: video.snippet?.channelTitle ?? undefined,
    description: video.snippet?.description ?? "",
    duration: video.contentDetails?.duration ?? undefined,
    privacyStatus: video.status?.privacyStatus ?? undefined,
    thumbnailUrl: pickThumbnailUrl(video.snippet?.thumbnails),
    title: video.snippet?.title ?? "(untitled video)",
    videoId,
    videoPublishedAt: video.snippet?.publishedAt ?? undefined
  };
}

function mapPlaylist(playlist: youtube_v3.Schema$Playlist): PlaylistSummary {
  const playlistId = playlist.id;

  if (!playlistId) {
    throw new AppError("youtube_invalid_playlist", "Received an incomplete playlist from YouTube");
  }

  return {
    channelTitle: playlist.snippet?.channelTitle ?? undefined,
    description: playlist.snippet?.description ?? "",
    itemCount: playlist.contentDetails?.itemCount ?? undefined,
    playlistId,
    privacyStatus: playlist.status?.privacyStatus ?? undefined,
    publishedAt: playlist.snippet?.publishedAt ?? undefined,
    title: playlist.snippet?.title ?? "(untitled playlist)"
  };
}

function normalizePageSize(pageSize?: number): number | undefined {
  if (pageSize === undefined) {
    return undefined;
  }

  return Math.max(1, Math.min(50, pageSize));
}

export class YouTubeService implements YouTubeServiceApi {
  private uploadsPlaylistId?: string;

  constructor(private readonly api: YouTubeApiLike) {}

  async getMyUploadsPlaylistId(): Promise<string> {
    if (this.uploadsPlaylistId) {
      return this.uploadsPlaylistId;
    }

    try {
      const response = await this.api.channels.list({
        mine: true,
        part: ["contentDetails"]
      });

      const uploadsPlaylistId = response.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        throw new AppError("uploads_playlist_not_found", "Could not determine the uploads playlist for the authenticated channel", 404);
      }

      this.uploadsPlaylistId = uploadsPlaylistId;
      return uploadsPlaylistId;
    } catch (error) {
      throw normalizeYouTubeError(error, "youtube_channels_request_failed");
    }
  }

  async listMyUploads(params: {
    pageSize?: number;
    pageToken?: string;
    privacyStatus?: string;
    query?: string;
  }): Promise<PagedResult<VideoSummary>> {
    const uploadsPlaylistId = await this.getMyUploadsPlaylistId();
    const result = await this.listPlaylistItems({
      pageSize: params.pageSize,
      pageToken: params.pageToken,
      playlistId: uploadsPlaylistId
    });

    const filteredItems = result.items.filter(item => {
      if (params.privacyStatus && item.privacyStatus !== params.privacyStatus) {
        return false;
      }

      if (params.query) {
        const haystack = [item.title, item.description, item.channelTitle].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(params.query.toLowerCase());
      }

      return true;
    });

    return {
      items: filteredItems.map(({ playlistId: _playlistId, playlistItemId: _playlistItemId, position: _position, ...video }) => video),
      nextPageToken: result.nextPageToken,
      prevPageToken: result.prevPageToken
    };
  }

  async findMyUploads(params: QueryParams): Promise<QueryResult<VideoSummary>> {
    const uploadsPlaylistId = await this.getMyUploadsPlaylistId();
    const result = await this.findPlaylistItems({
      ...params,
      playlistId: uploadsPlaylistId
    });

    return {
      ...result,
      items: result.items.map(({ playlistId: _playlistId, playlistItemId: _playlistItemId, position: _position, ...video }) => video)
    };
  }

  async getVideoById(videoId: string): Promise<VideoDetail> {
    try {
      const response = await this.api.videos.list({
        id: [videoId],
        part: ["snippet", "status", "contentDetails"]
      });

      const video = response.data.items?.[0];
      if (!video) {
        throw new AppError("video_not_found", `No accessible video found for id ${videoId}`, 404);
      }

      return mapVideo(video);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw normalizeYouTubeError(error, "youtube_videos_request_failed");
    }
  }

  async getPlaylistById(playlistId: string): Promise<PlaylistDetail> {
    try {
      const response = await this.api.playlists.list({
        id: [playlistId],
        part: ["snippet", "status", "contentDetails"]
      });

      const playlist = response.data.items?.[0];
      if (!playlist) {
        throw new AppError("playlist_not_found", `No accessible playlist found for id ${playlistId}`, 404);
      }

      return mapPlaylist(playlist);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw normalizeYouTubeError(error, "youtube_playlists_request_failed");
    }
  }

  async listPlaylistItems(params: {
    pageSize?: number;
    pageToken?: string;
    playlistId: string;
  }): Promise<PagedResult<PlaylistItem>> {
    try {
      const response = await this.api.playlistItems.list({
        maxResults: normalizePageSize(params.pageSize),
        pageToken: params.pageToken,
        part: ["snippet", "status", "contentDetails"],
        playlistId: params.playlistId
      });

      return {
        items: (response.data.items ?? []).map(mapPlaylistItem),
        nextPageToken: response.data.nextPageToken ?? undefined,
        prevPageToken: response.data.prevPageToken ?? undefined
      };
    } catch (error) {
      throw normalizeYouTubeError(error, "youtube_playlist_items_request_failed");
    }
  }

  async findPlaylistItems(params: QueryParams & { playlistId: string }): Promise<QueryResult<PlaylistItem>> {
    const scanLimit = params.maxItemsScanned ?? 200;
    const collected: PlaylistItem[] = [];
    let nextPageToken: string | undefined;

    try {
      do {
        const response = await this.api.playlistItems.list({
          maxResults: Math.min(50, Math.max(1, scanLimit - collected.length)),
          pageToken: nextPageToken,
          part: ["snippet", "status", "contentDetails"],
          playlistId: params.playlistId
        });

        collected.push(...(response.data.items ?? []).map(mapPlaylistItem));
        nextPageToken = response.data.nextPageToken ?? undefined;
      } while (nextPageToken && collected.length < scanLimit);

      const result = queryItems(collected, params);
      return {
        ...result,
        isPartial: Boolean(nextPageToken) || result.isPartial
      };
    } catch (error) {
      throw normalizeYouTubeError(error, "youtube_playlist_items_request_failed");
    }
  }
}
