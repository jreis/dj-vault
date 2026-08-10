/**
 * Dev re-export of the shared YouTube search handlers.
 * Vite middleware and CF Pages Functions share one implementation.
 */

export {
  handleSimilarSearch,
  handleTrackSearch,
  type DiscoveryEnv,
  type SimilarSearchResult,
} from "../functions/_lib/youtubeSimilar.ts"
