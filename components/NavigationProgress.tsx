'use client'

/**
 * The previous implementation simulated a loading bar with timers that kept
 * the old view visible for ~500ms even after navigation finished. That made
 * the UI feel sluggish. We now skip the fake progress entirely so clicking a
 * link shows the next page immediately.
 */
export default function NavigationProgress() {
  return null
}

