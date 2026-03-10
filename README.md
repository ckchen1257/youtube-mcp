# YouTube Private Content MCP Server

Remote HTTP MCP server for:

- your own channel uploads
- private videos your OAuth account can access
- known playlist IDs or video IDs, including member-only content you can already view

This server does **not** try to discover member-only videos automatically. For member content, pass a known `videoId` or `playlistId`.

## Features

- `youtube_list_my_uploads`
- `youtube_find_my_uploads`
- `youtube_get_video`
- `youtube_get_playlist`
- `youtube_list_playlist_items`
- `youtube_find_playlist_items`

## Requirements

- Node.js 22+
- A Google Cloud project with the YouTube Data API v3 enabled
- An OAuth client ID/secret
- A refresh token for the scope `https://www.googleapis.com/auth/youtube.readonly`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` or fill in `.env.local` with your OAuth values.
   `.env.local` is intended for local-only secrets and is ignored by git.

3. Start the server in dev mode:

```bash
npm run dev
```

4. Or build and run production output:

```bash
npm run build
npm start
```

## Local Testing

1. Put your OAuth values in `.env.local` or `.env`.
2. Run the automated repo checks:

```bash
npm test
npm run build
```

3. Start the MCP server locally:

```bash
npm run dev
```

4. In another terminal, run the local smoke checks:

```bash
npm run test:local:health
npm run test:local:mcp
```

5. Call a specific MCP tool with JSON arguments:

```bash
npm run test:local:mcp -- http://127.0.0.1:3000/mcp youtube_get_video "{\"videoId\":\"YOUR_VIDEO_ID\"}"
```

6. Example playlist item test:

```bash
npm run test:local:mcp -- http://127.0.0.1:3000/mcp youtube_list_playlist_items "{\"playlistId\":\"YOUR_PLAYLIST_ID\",\"pageSize\":5}"
```

The MCP smoke script will:

- connect to the local remote MCP endpoint
- verify the expected tool list is present
- optionally call one tool and print the structured result

## Getting a Refresh Token

This project expects you to obtain the refresh token outside the app.

Recommended flow:

1. Create an OAuth client in Google Cloud Console.
2. Enable the YouTube Data API v3.
3. Authorize the scope `https://www.googleapis.com/auth/youtube.readonly`.
4. Exchange the authorization code for tokens and keep the `refresh_token`.

Any external OAuth flow is fine as long as it yields a refresh token for the same Google account that owns or can access the target content.

## HTTP Endpoints

- `GET /health`
- `POST /mcp`

The MCP server uses Streamable HTTP and is intended to sit behind a reverse proxy that handles TLS and authentication.

## Example MCP Client Config

Example remote MCP endpoint:

```json
{
  "youtube-private": {
    "url": "https://your-domain.example/mcp"
  }
}
```

## Development

Run tests:

```bash
npm test
```

Build TypeScript:

```bash
npm run build
```
