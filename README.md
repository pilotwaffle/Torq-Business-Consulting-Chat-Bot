# TORQ Business Consulting Chatbot

A multi-consultant AI chat application built with React + Vite. Each consultant
is a distinct persona (Strategic Advisor, Code Architect, Legal Intelligence,
Retirement Planning, E-book Character Intelligence, Marketing, Finance,
Operations) with its own system prompt and, where relevant, custom tools.

**AI provider:** [Anthropic Claude](https://www.anthropic.com/) (`claude-sonnet-5`),
via the official `@anthropic-ai/sdk`. (Migrated from Google Gemini.)

## Features

- Multiple expert consultant personas
- Streaming responses
- Tool/function calling (stock lookups, legal risk scoring, estate & retirement
  planning helpers, character-development tools, etc.)
- Web search (via Anthropic's server-side `web_search` tool) for consultants
  that need current information
- Image and text-file attachments
- Conversation history with auto-generated titles

> **Note:** The live voice conversation feature was removed in the migration —
> it relied on Gemini's real-time native-audio API, which Anthropic does not
> provide.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```
   npm install
   ```
2. Create a `.env` file (copy from `.env.example`) and set your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
   Get a key at https://console.anthropic.com/settings/keys
3. Run the app:
   ```
   npm run dev
   ```

## ⚠️ Security

This is a **client-side (browser) app** that calls the Anthropic API directly.
The API key is bundled into the shipped JavaScript and is **visible to anyone
who loads the site**. This is fine for local/personal use only.

**Do NOT deploy this publicly with a live key.** For a public deployment, move
the Anthropic call behind a small server-side proxy (e.g. a serverless function)
that holds the key, and have the browser call your own endpoint instead.
