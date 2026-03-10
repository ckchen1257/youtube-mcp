import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { AppError } from "../youtube/errors.js";
import type { PlaylistItem, QueryResult, VideoSummary, YouTubeServiceApi } from "../youtube/types.js";

type StructuredPayload = Record<string, unknown>;

function asStructuredPayload(payload: unknown): StructuredPayload {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as StructuredPayload;
  }

  return {
    value: payload
  };
}

function asToolResult(payload: unknown) {
  const structuredPayload = asStructuredPayload(payload);

  return {
    content: [
      {
        text: JSON.stringify(structuredPayload, null, 2),
        type: "text" as const
      }
    ],
    structuredContent: structuredPayload
  };
}

function toolError(error: unknown) {
  if (error instanceof AppError) {
    return {
      content: [
        {
          text: error.message,
          type: "text" as const
        }
      ],
      isError: true,
      structuredContent: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode
      }
    };
  }

  const message = error instanceof Error ? error.message : "Unexpected tool failure";
  return {
    content: [
      {
        text: message,
        type: "text" as const
      }
    ],
    isError: true,
    structuredContent: {
      code: "unexpected_error",
      message
    }
  };
}

const listUploadsSchema = z.object({
  pageSize: z.number().int().min(1).max(50).optional(),
  pageToken: z.string().optional(),
  privacyStatus: z.enum(["private", "public", "unlisted"]).optional(),
  query: z.string().min(1).optional()
});

const findSchema = z.object({
  channelTitle: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  maxItemsScanned: z.number().int().min(1).max(500).optional(),
  privacyStatus: z.enum(["private", "public", "unlisted"]).optional(),
  query: z.string().min(1).optional(),
  sortBy: z.enum(["playlistPosition", "addedAt", "videoPublishedAt", "title"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  videoId: z.string().min(1).optional()
});

const listPlaylistItemsSchema = z.object({
  pageSize: z.number().int().min(1).max(50).optional(),
  pageToken: z.string().optional(),
  playlistId: z.string().min(1)
});

const getVideoSchema = z.object({
  videoId: z.string().min(1)
});

const getPlaylistSchema = z.object({
  playlistId: z.string().min(1)
});

const findPlaylistItemsSchema = findSchema.extend({
  playlistId: z.string().min(1)
});

function describeQueryResult(result: QueryResult<VideoSummary | PlaylistItem>): string {
  return `${result.matchedCount} matching items (${result.items.length} returned, scanned ${result.scannedItemCount})`;
}

export function registerYouTubeTools(server: McpServer, service: YouTubeServiceApi): void {
  server.registerTool(
    "youtube_list_my_uploads",
    {
      description: "List uploads from the authenticated YouTube channel, including private videos the account can access.",
      inputSchema: listUploadsSchema
    },
    async args => {
      try {
        const result = await service.listMyUploads(args);
        return asToolResult(result);
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "youtube_find_my_uploads",
    {
      description: "Scan and query uploads from the authenticated YouTube channel.",
      inputSchema: findSchema
    },
    async args => {
      try {
        const result = await service.findMyUploads(args);
        return {
          ...asToolResult(result),
          content: [
            {
              text: describeQueryResult(result),
              type: "text" as const
            }
          ]
        };
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "youtube_get_video",
    {
      description: "Fetch a single YouTube video by ID. Useful for private videos or known member-only video IDs the account can access.",
      inputSchema: getVideoSchema
    },
    async ({ videoId }) => {
      try {
        const result = await service.getVideoById(videoId);
        return asToolResult(result);
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "youtube_get_playlist",
    {
      description: "Fetch metadata for a known YouTube playlist ID.",
      inputSchema: getPlaylistSchema
    },
    async ({ playlistId }) => {
      try {
        const result = await service.getPlaylistById(playlistId);
        return asToolResult(result);
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "youtube_list_playlist_items",
    {
      description: "List items from a known YouTube playlist ID, including member-only playlists the account can access.",
      inputSchema: listPlaylistItemsSchema
    },
    async args => {
      try {
        const result = await service.listPlaylistItems(args);
        return asToolResult(result);
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "youtube_find_playlist_items",
    {
      description: "Scan, filter, and sort items inside a known playlist ID.",
      inputSchema: findPlaylistItemsSchema
    },
    async args => {
      try {
        const result = await service.findPlaylistItems(args);
        return {
          ...asToolResult(result),
          content: [
            {
              text: describeQueryResult(result),
              type: "text" as const
            }
          ]
        };
      } catch (error) {
        return toolError(error);
      }
    }
  );
}
