import { google, type youtube_v3 } from "googleapis";

import type { AppConfig } from "../config/env.js";

export function createYouTubeClient(config: AppConfig): youtube_v3.Youtube {
  const auth = new google.auth.OAuth2({
    clientId: config.youtube.clientId,
    clientSecret: config.youtube.clientSecret
  });

  auth.setCredentials({
    refresh_token: config.youtube.refreshToken
  });

  return google.youtube({
    auth,
    version: "v3"
  });
}
