# Canvas Latency Optimization

## What This Is

Performance optimization project for ERASERIO's canvas drawing experience. The goal is to eliminate noticeable latency when drawing with a stylus on tablets, making the drawing feel as responsive as native apps like Samsung Notes or GoodNotes.

## Core Value

Drawing must feel instantaneous — strokes appear immediately under the pen with no perceptible lag.

## Requirements

### Validated

- ✓ Collaborative workspace with document editor — existing
- ✓ Whiteboard canvas with Excalidraw integration — existing
- ✓ Real-time persistence via Convex — existing
- ✓ Team-based file organization — existing
- ✓ Cookie-based authentication — existing

### Active

- [ ] Strokes appear immediately with no visible delay
- [ ] Pen position and rendered stroke stay in sync (no trailing)
- [ ] Smooth, jank-free stroke rendering at 60fps+
- [ ] Works on Samsung tablets with stylus
- [ ] Maintains collaborative save functionality

### Out of Scope

- Replacing the entire Excalidraw library without research justification — avoid premature optimization
- Native app development — staying web-based
- Supporting outdated browsers — focus on modern tablet browsers

## Context

**Current state:**
- Canvas uses `@excalidraw/excalidraw` v0.17.3
- `onChange` callback triggers React state update on every stroke change
- This causes React re-renders during active drawing
- Convex mutations handle persistence

**User environment:**
- Samsung tablet with stylus
- Comparing against Samsung Notes and GoodNotes (native apps)
- These native apps have direct GPU access and system-level stylus handling

**Known performance issues from codebase analysis:**
- React state updates during drawing cause re-renders
- No debouncing on save-related state changes
- Fixed 670px canvas height may cause layout issues

## Constraints

- **Library:** Must decide whether to optimize Excalidraw or replace it based on research
- **Platform:** Solution must work in mobile browsers on Samsung tablets
- **Compatibility:** Must maintain existing save/load functionality with Convex
- **UX baseline:** Must match or approach native app responsiveness

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Research before implementing | Native apps use fundamentally different techniques; need to understand what's achievable in web | — Pending |

---
*Last updated: 2026-02-01 after initialization*
