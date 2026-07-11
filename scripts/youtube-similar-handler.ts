/**
 * Dev re-export of the shared YouTube similar-search handler.
 * Vite middleware and CF Pages Function share one implementation.
 */

export {
  handleSimilarSearch,
  type DiscoveryEnv,
  type SimilarSearchResult,
} from "../functions/_lib/youtubeSimilar.ts"
