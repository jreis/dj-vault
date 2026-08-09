import type { Playlist } from "../types"

/**
 * Jason's curated playlists - featured collections
 * These playlists are auto-loaded if the user has no playlists yet
 */
export const SEED_PLAYLISTS: Playlist[] = [
  {
    id: "jason-grunge",
    name: "Grunge Essentials",
    description: "The Seattle sound that defined a generation",
    trackIds: [
      "seed-2",  // Smells Like Teen Spirit - Nirvana
      "seed-10", // Alive - Pearl Jam
      "seed-4",  // Black Hole Sun - Soundgarden
      "seed-14", // Man in the Box - Alice in Chains
      "seed-11", // Everlong - Foo Fighters
    ],
    curated: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "jason-metal-classics",
    name: "Metal Classics",
    description: "Headbanging essentials from the masters",
    trackIds: [
      "seed-16", // Master of Puppets - Metallica
      "seed-1",  // Enter Sandman - Metallica
      "seed-9",  // Paranoid - Black Sabbath
      "seed-8",  // Back in Black - AC/DC
      "seed-13", // Schism - Tool
    ],
    curated: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "jason-punk-energy",
    name: "Punk Energy",
    description: "Fast, loud, and unapologetic",
    trackIds: [
      "seed-5",  // Basket Case - Green Day
      "seed-17", // Boulevard of Broken Dreams - Green Day
      "seed-12", // Self Esteem - The Offspring
    ],
    curated: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "jason-nu-metal",
    name: "Nu Metal Anthems",
    description: "When metal met hip-hop in the late 90s",
    trackIds: [
      "seed-6",  // Chop Suey! - System of a Down
      "seed-7",  // In the End - Linkin Park
      "seed-18", // Numb - Linkin Park
    ],
    curated: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "jason-rage",
    name: "Rage & Revolution",
    description: "For when you need to fight the power",
    trackIds: [
      "seed-3",  // Killing in the Name - Rage Against the Machine
      "seed-15", // Bulls on Parade - Rage Against the Machine
      "seed-6",  // Chop Suey! - System of a Down
    ],
    curated: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "jason-heavy-hitters",
    name: "Heavy Hitters",
    description: "Maximum volume, maximum intensity",
    trackIds: [
      "seed-16", // Master of Puppets - Metallica
      "seed-3",  // Killing in the Name - Rage Against the Machine
      "seed-6",  // Chop Suey! - System of a Down
      "seed-13", // Schism - Tool
      "seed-4",  // Black Hole Sun - Soundgarden
      "seed-9",  // Paranoid - Black Sabbath
    ],
    curated: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
]
