---
created: 2025-01-11T21:35
title: Skip embed check for v.redd.it links
area: bot
files:
  - src/bot.ts
  - src/linkUtils.ts
---

## Problem

When a link is a direct v.redd.it URL (e.g., `https://v.redd.it/8iudhwqogrcg1`), the bot currently waits 5 seconds to check for video/gallery embeds before deciding whether to keep or auto-revert the conversion.

For v.redd.it links, this check is unnecessary — these are always direct video links and should always be converted to redditez without the embed check delay.

## Solution

Detect v.redd.it URLs in the link detection/conversion flow and skip the 5-second embed check for these links. Either:
1. Add a flag to mark links as "guaranteed video" and bypass `hasVideoOrGallery()` check
2. Check if all detected links are v.redd.it before starting the embed wait timer
3. Modify the auto-revert logic to never revert v.redd.it conversions

TBD: Determine best approach based on code structure.
