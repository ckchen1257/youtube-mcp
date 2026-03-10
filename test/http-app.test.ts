import { createServer } from "node:http";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../src/http/app.js";
import type { PlaylistItem, VideoDetail, YouTubeServiceApi } from "../src/youtube/types.js";

const fakeVideo: VideoDetail = {
  addedAt: "2025-01-01T00:00:00Z",
  channelTitle: "My Channel",
  description: "Detailed video",
  duration: "PT3M",
  privacyStatus: "private",
  thumbnailUrl: "https://example.com/video.jpg",
  title: "Detailed video",
  videoId: "video-1",
  videoPublishedAt: "2025-01-02T00:00:00Z"
};

const fakeService: YouTubeServiceApi = {
  async findMyUploads() {
    return {
      filtersApplied: {},
      isPartial: false,
      items: [fakeVideo],
      matchedCount: 1,
      scannedItemCount: 1,
      sort: {
        direction: "asc",
        field: "playlistPosition"
      }
    };
  },
  async findPlaylistItems() {
    return {
      filtersApplied: {},
      isPartial: false,
      items: [
        {
          ...fakeVideo,
          playlistId: "playlist-1",
          playlistItemId: "item-1",
          position: 0
        }
      ],
      matchedCount: 1,
      scannedItemCount: 1,
      sort: {
        direction: "asc",
        field: "playlistPosition"
      }
    };
  },
  async getPlaylistById() {
    return {
      channelTitle: "My Channel",
      description: "Member-only archive",
      itemCount: 1,
      playlistId: "playlist-1",
      privacyStatus: "private",
      publishedAt: "2025-01-01T00:00:00Z",
      title: "Archive"
    };
  },
  async getVideoById() {
    return fakeVideo;
  },
  async listMyUploads() {
    return {
      items: [fakeVideo],
      nextPageToken: "next-uploads"
    };
  },
  async listPlaylistItems() {
    return {
      items: [
        {
          ...fakeVideo,
          playlistId: "playlist-1",
          playlistItemId: "item-1",
          position: 0
        }
      ],
      nextPageToken: "next-playlist"
    };
  }
};

describe("createApp", () => {
  const servers: Array<ReturnType<typeof createServer>> = [];

  afterEach(async () => {
    await Promise.all(
      servers.map(
        server =>
          new Promise<void>((resolve, reject) => {
            server.close(error => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            });
          })
      )
    );
    servers.length = 0;
  });

  it("serves health checks", async () => {
    const app = createApp({
      host: "127.0.0.1",
      mcpBasePath: "/mcp",
      port: 0,
      serverVersion: "0.1.0"
    }, fakeService);

    const server = createServer(app);
    servers.push(server);

    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP address");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      service: "youtube-private-mcp-server",
      status: "ok"
    });
  });

  it("exposes MCP tools over streamable HTTP", async () => {
    const app = createApp({
      host: "127.0.0.1",
      mcpBasePath: "/mcp",
      port: 0,
      serverVersion: "0.1.0"
    }, fakeService);

    const server = createServer(app);
    servers.push(server);

    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP address");
    }

    const client = new Client({
      name: "test-client",
      version: "1.0.0"
    });
    const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`));

    try {
      await client.connect(transport);

      const toolList = await client.listTools();
      expect(toolList.tools.map(tool => tool.name)).toEqual([
        "youtube_list_my_uploads",
        "youtube_find_my_uploads",
        "youtube_get_video",
        "youtube_get_playlist",
        "youtube_list_playlist_items",
        "youtube_find_playlist_items"
      ]);

      const result = await client.callTool({
        name: "youtube_get_video",
        arguments: {
          videoId: "video-1"
        }
      });

      expect(result.structuredContent).toMatchObject({
        title: "Detailed video",
        videoId: "video-1"
      });
    } finally {
      await client.close();
    }
  });
});
