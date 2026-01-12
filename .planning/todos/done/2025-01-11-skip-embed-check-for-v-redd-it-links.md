---
created: 2025-01-11T21:35
title: Skip embed check for v.redd.it links
area: bot
files:
  - src/bot.ts
  - src/linkUtils.ts
---

## Problem

When a link is a direct v.redd.it URL (e.g., `https://v.redd.it/8iudhwqogrcg1`), the bot currently:
1. Converts the link to redditez.com ✓
2. Waits 5 seconds for embeds to load
3. Checks if the embed contains video/gallery content
4. Auto-reverts if no video/gallery detected

The 5-second verification step (steps 2-4) is unnecessary for v.redd.it links because they are **always** embedded videos. The conversion should still happen, but the verification can be skipped.

## Solution

Keep the v.redd.it → redditez.com conversion, but skip the 5-second embed verification step for v.redd.it links.

Approach:
1. After detecting links, check if any are v.redd.it URLs
2. If all detected links are v.redd.it, skip the `setTimeout` and `hasVideoOrGallery()` check entirely
3. The converted message stays permanently (no auto-revert possibility)

This saves 5 seconds of delay and avoids unnecessary Discord API calls for links that are guaranteed to be videos.
