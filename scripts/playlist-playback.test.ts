import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  holdRemovedTrack,
  retainPlaylistTracks,
  seedsForPlaylist,
  tracksForPlaylist,
  tracksForPlaylistPublish,
} from "../src/lib/playlistPlayback.ts"
import type { Playlist, Track } from "../src/types.ts"

function track(over: Partial<Track> & Pick<Track, "id" | "title" | "youtubeId">): Track {
  return {
    artist: "Band",
    genre: "Metal",
    era: "90s",
    year: 1991,
    score: 0,
    notes: "",
    addedAt: "2025-01-01T00:00:00.000Z",
    ...over,
  }
}

function playlist(
  trackIds: string[],
): Playlist {
  return {
    id: "pl-tonight",
    name: "Tonight",
    trackIds,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  }
}

describe("playlist playback after a song leaves the vault", () => {
  it("plays vault songs and catalog songs that were removed", () => {
    const custom = track({
      id: "t_custom",
      title: "Walk",
      youtubeId: "walkwalk111",
    })
    const seed = track({
      id: "seed-2",
      title: "Smells Like Teen Spirit",
      youtubeId: "hTWKbfoikeg",
    })
    const pl = playlist(["t_custom", "seed-2", "seed-missing"])

    const held = holdRemovedTrack([], [pl], custom)

    const playable = tracksForPlaylist(pl.trackIds, {
      library: [],
      held,
      seeds: [seed],
    })

    assert.deepEqual(
      playable.map((t) => t.youtubeId),
      ["walkwalk111", "hTWKbfoikeg"],
    )
  })

  it("keeps a snapshot when the catalog no longer has the song", () => {
    const removed = track({
      id: "seed-2",
      title: "Smells Like Teen Spirit",
      youtubeId: "hTWKbfoikeg",
    })
    const pl = playlist(["seed-2"])
    const held = holdRemovedTrack([], [pl], removed)

    const playable = tracksForPlaylist(pl.trackIds, {
      library: [],
      held,
      seeds: [],
    })

    assert.equal(playable[0]?.youtubeId, "hTWKbfoikeg")
  })

  it("prefers the catalog upload over a stale snapshot", () => {
    const snapshot = track({
      id: "seed-2",
      title: "Smells Like Teen Spirit",
      youtubeId: "oldoldold11",
    })
    const catalog = track({
      id: "seed-2",
      title: "Smells Like Teen Spirit",
      youtubeId: "hTWKbfoikeg",
    })

    const playable = tracksForPlaylist(["seed-2"], {
      library: [],
      held: [snapshot],
      seeds: [catalog],
    })

    assert.equal(playable[0]?.youtubeId, "hTWKbfoikeg")
  })

  it("does not keep a copy when no playlist still lists the song", () => {
    const removed = track({
      id: "t_custom",
      title: "Walk",
      youtubeId: "walkwalk111",
    })
    const held = holdRemovedTrack([], [playlist(["seed-2"])], removed)
    assert.deepEqual(held, [])
  })

  it("keeps bundled songs when the published catalog is a different set", () => {
    const published = track({
      id: "seed-73",
      title: "Battery",
      youtubeId: "battery11111",
    })
    const bundled = track({
      id: "seed-2",
      title: "Smells Like Teen Spirit",
      youtubeId: "hTWKbfoikeg",
    })

    const playable = tracksForPlaylist(["seed-2", "seed-73"], {
      library: [],
      held: [],
      seeds: seedsForPlaylist([published], [bundled]),
    })

    assert.deepEqual(
      playable.map((t) => t.id),
      ["seed-2", "seed-73"],
    )
  })

  it("prefers the published upload when both catalogs share an id", () => {
    const published = track({
      id: "seed-2",
      title: "Smells Like Teen Spirit",
      youtubeId: "newnewnew11",
    })
    const bundled = track({
      id: "seed-2",
      title: "Smells Like Teen Spirit",
      youtubeId: "hTWKbfoikeg",
    })

    const playable = tracksForPlaylist(["seed-2"], {
      library: [],
      held: [],
      seeds: seedsForPlaylist([published], [bundled]),
    })

    assert.equal(playable[0]?.youtubeId, "newnewnew11")
  })

  it("remembers every playlist song that leaves the vault together", () => {
    const kept = track({
      id: "seed-2",
      title: "Smells Like Teen Spirit",
      youtubeId: "hTWKbfoikeg",
    })
    const dropped = track({
      id: "seed-9",
      title: "Paranoid",
      youtubeId: "0qanF-91aJo",
    })
    const held = retainPlaylistTracks([], [playlist(["seed-2"])], [kept, dropped])
    assert.deepEqual(
      held.map((t) => t.id),
      ["seed-2"],
    )
  })

  it("publishes snapshots that playlists still name", () => {
    const library = track({
      id: "seed-73",
      title: "Battery",
      youtubeId: "battery11111",
    })
    const held = track({
      id: "seed-2",
      title: "Smells Like Teen Spirit",
      youtubeId: "hTWKbfoikeg",
    })
    const list = tracksForPlaylistPublish([library], [held], [playlist(["seed-2"])])
    assert.deepEqual(
      list.map((t) => t.id),
      ["seed-73", "seed-2"],
    )
  })
})
