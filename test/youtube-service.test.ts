import { describe, expect, it } from "vitest";

import { AppError } from "../src/youtube/errors.js";
import { YouTubeService } from "../src/youtube/service.js";

describe("YouTubeService", () => {
  it("maps uploads playlist items and filters by query/privacy status", async () => {
    const service = new YouTubeService({
      channels: {
        list: async () => ({
          data: {
            items: [
              {
                contentDetails: {
                  relatedPlaylists: {
                    uploads: "uploads-playlist"
                  }
                }
              }
            ]
          }
        })
      },
      playlistItems: {
        list: async () => ({
          data: {
            items: [
              {
                contentDetails: {
                  videoId: "video-a",
                  videoPublishedAt: "2025-01-02T00:00:00Z"
                },
                id: "item-a",
                snippet: {
                  channelTitle: "My Channel",
                  description: "For members",
                  playlistId: "uploads-playlist",
                  position: 0,
                  publishedAt: "2025-01-01T00:00:00Z",
                  thumbnails: {
                    medium: {
                      url: "https://example.com/a.jpg"
                    }
                  },
                  title: "Members Update"
                },
                status: {
                  privacyStatus: "private"
                }
              },
              {
                contentDetails: {
                  videoId: "video-b",
                  videoPublishedAt: "2025-01-03T00:00:00Z"
                },
                id: "item-b",
                snippet: {
                  channelTitle: "My Channel",
                  description: "Public tutorial",
                  playlistId: "uploads-playlist",
                  position: 1,
                  publishedAt: "2025-01-02T00:00:00Z",
                  thumbnails: {
                    medium: {
                      url: "https://example.com/b.jpg"
                    }
                  },
                  title: "Public Guide"
                },
                status: {
                  privacyStatus: "public"
                }
              }
            ],
            nextPageToken: "next-page"
          }
        })
      },
      playlists: {
        list: async () => ({
          data: {
            items: []
          }
        })
      },
      videos: {
        list: async () => ({
          data: {
            items: []
          }
        })
      }
    });

    const result = await service.listMyUploads({
      pageSize: 10,
      privacyStatus: "private",
      query: "members"
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.videoId).toBe("video-a");
    expect(result.nextPageToken).toBe("next-page");
  });

  it("maps a video by id and throws not found for unknown videos", async () => {
    const service = new YouTubeService({
      channels: {
        list: async () => ({
          data: {
            items: []
          }
        })
      },
      playlistItems: {
        list: async () => ({
          data: {
            items: []
          }
        })
      },
      playlists: {
        list: async () => ({
          data: {
            items: []
          }
        })
      },
      videos: {
        list: async ({ id }) => {
          if (Array.isArray(id) && id[0] === "video-a") {
            return {
              data: {
                items: [
                  {
                    contentDetails: {
                      duration: "PT10M"
                    },
                    id: "video-a",
                    snippet: {
                      channelTitle: "My Channel",
                      description: "Detailed video",
                      publishedAt: "2025-02-02T00:00:00Z",
                      thumbnails: {
                        medium: {
                          url: "https://example.com/video-a.jpg"
                        }
                      },
                      title: "Deep Dive"
                    },
                    status: {
                      privacyStatus: "private"
                    }
                  }
                ]
              }
            };
          }

          return {
            data: {
              items: []
            }
          };
        }
      }
    });

    const video = await service.getVideoById("video-a");
    expect(video.videoId).toBe("video-a");
    expect(video.duration).toBe("PT10M");

    await expect(service.getVideoById("missing-video")).rejects.toMatchObject({
      code: "video_not_found"
    });
  });
});
