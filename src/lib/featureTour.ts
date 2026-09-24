export interface TourStep {
  title: string
  description: string
  icon: string
}

/**
 * First-visit slides. The opening title uses the seed catalog the visitor
 * actually starts from: the published catalog when one exists, otherwise
 * the bundled list.
 */
export function tourSteps(seedCount: number): TourStep[] {
  const tracksLabel = seedCount === 1 ? "Curated Track" : "Curated Tracks"
  return [
    {
      title: `🎵 ${seedCount} ${tracksLabel}`,
      description:
        "Start with classics from Metallica, Nirvana, Tool, Ghost, and more. Vote tracks up/down to build your favorites.",
      icon: "🎸",
    },
    {
      title: "🔍 Smart Discovery",
      description:
        "Type a name in Search and press Enter to find it on YouTube. Preview before you add — nothing is saved until you want it. Similar knows Tesla → Def Leppard, Nirvana → Pearl Jam, and more!",
      icon: "✨",
    },
    {
      title: "📻 Radio Mode",
      description:
        "Start radio for endless playback. It automatically queues similar tracks, creating a personalized music journey.",
      icon: "📡",
    },
    {
      title: "💾 Playlists & Dedications",
      description:
        "Save playlists with personal dedications (e.g., 'In memory of...'). Everything auto-saves. Use Backup to download a copy.",
      icon: "💝",
    },
    {
      title: "🎬 Set Mode (Press F)",
      description:
        "Fullscreen mode with live audio visualizer. Perfect for parties or remembering someone special through their music.",
      icon: "🎆",
    },
    {
      title: "🌐 Share Anywhere",
      description:
        "Every playlist gets a share link. Friends can play it instantly without signing up. Your music, their browser, that simple.",
      icon: "🔗",
    },
  ]
}
