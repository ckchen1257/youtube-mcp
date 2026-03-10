export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function normalizeYouTubeError(error: unknown, fallbackCode = "youtube_request_failed"): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const maybeStatus = typeof error === "object" && error !== null ? Reflect.get(error, "status") : undefined;
  const maybeMessage = error instanceof Error ? error.message : "Unknown YouTube API error";

  if (maybeStatus === 401) {
    return new AppError("youtube_auth_failed", "YouTube OAuth credentials were rejected", 401);
  }

  if (maybeStatus === 403) {
    return new AppError("youtube_access_denied", "The authenticated account cannot access this YouTube resource", 403);
  }

  if (maybeStatus === 404) {
    return new AppError("youtube_not_found", "The requested YouTube resource was not found", 404);
  }

  return new AppError(fallbackCode, maybeMessage, typeof maybeStatus === "number" ? maybeStatus : 500);
}
