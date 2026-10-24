import { Tab, UGChordCollection } from '../../types/tabs'

// Ported 1:1 in homenet-documentation's remarkable-sync/sync.py so the
// reMarkable PDF spells transposed chords the same way the UI does.

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const NATURALS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}
// Pitch classes of keys conventionally written with flats: C F Bb Eb Ab Db / A D G C F Bb Eb minor.
const FLAT_MAJOR_KEYS = new Set([0, 5, 10, 3, 8, 1])
const FLAT_MINOR_KEYS = new Set([9, 2, 7, 0, 5, 10, 3])

const NOTE_RE = /^([A-G])([#b]?)/
const CHORD_SPAN_RE = /(<span[^>]*js-chord-chord[^>]*>)([^<]*)(<\/span>)/g
const CHORD_TAG_RE = /\[ch\]([^[]*)\[\/ch\]/g

function pitchClass(note: string): number | null {
  const m = NOTE_RE.exec(note)
  if (!m) return null
  const offset = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0
  return (NATURALS[m[1]] + offset + 12) % 12
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

function shiftNote(note: string, semitones: number, flats: boolean): string {
  const m = NOTE_RE.exec(note)
  if (!m) return note
  const pc = mod12((pitchClass(m[0]) as number) + semitones)
  return (flats ? FLATS : SHARPS)[pc] + note.slice(m[0].length)
}

/** Whether the key that `keyChord` lands on after transposing is written with flats. */
export function prefersFlats(
  keyChord: string | undefined,
  semitones: number,
): boolean {
  const pc = keyChord ? pitchClass(keyChord.trim()) : null
  if (pc === null) return false
  const suffix = keyChord.trim().replace(NOTE_RE, '')
  const minor = suffix.startsWith('m') && !suffix.startsWith('maj')
  return (minor ? FLAT_MINOR_KEYS : FLAT_MAJOR_KEYS).has(mod12(pc + semitones))
}

export function transposeChord(
  chord: string,
  semitones: number,
  flats: boolean,
): string {
  if (mod12(semitones) === 0) return chord
  const [root, ...rest] = chord.split('/')
  const bass = rest.join('/')
  const shiftedRoot = shiftNote(root, semitones, flats)
  if (!rest.length) return shiftedRoot
  return `${shiftedRoot}/${
    pitchClass(bass) === null ? bass : shiftNote(bass, semitones, flats)
  }`
}

function firstMatch(
  re: RegExp,
  text: string | undefined,
  group: number,
): string | undefined {
  if (!text) return undefined
  const m = new RegExp(re.source).exec(text)
  return m ? m[group].trim() : undefined
}

/** The tab's key: UG's tonality if it names a note, else the first chord in the song. */
export function tabKey(tab: Tab | undefined): string | undefined {
  if (!tab) return undefined
  if (tab.tonality && pitchClass(tab.tonality) !== null) return tab.tonality
  return (
    firstMatch(CHORD_TAG_RE, tab.raw_tabs, 1) ??
    firstMatch(CHORD_SPAN_RE, tab.htmlTab, 2)
  )
}

export function transposeChordCollection(
  chords: UGChordCollection[] | undefined,
  semitones: number,
  flats: boolean,
): UGChordCollection[] | undefined {
  if (!chords || mod12(semitones) === 0) return chords
  const out = {}
  Object.keys(chords).forEach((key) => {
    out[transposeChord(key, semitones, flats)] = chords[key]
  })
  return out as UGChordCollection[]
}

/** Returns `tab` with every chord in htmlTab, raw_tabs and chordsDiagrams shifted by `semitones`. */
export function transposeTab(tab: Tab, semitones: number): Tab {
  if (!tab || mod12(semitones) === 0) return tab
  const flats = prefersFlats(tabKey(tab), semitones)
  const shift = (chord: string) => {
    const lead = chord.match(/^\s*/)[0]
    const trail = chord.match(/\s*$/)[0]
    return lead + transposeChord(chord.trim(), semitones, flats) + trail
  }
  return {
    ...tab,
    htmlTab: tab.htmlTab?.replace(
      CHORD_SPAN_RE,
      (_, open, chord, close) => open + shift(chord) + close,
    ),
    raw_tabs: tab.raw_tabs?.replace(
      CHORD_TAG_RE,
      (_, chord) => `[ch]${shift(chord)}[/ch]`,
    ),
    chordsDiagrams: transposeChordCollection(
      tab.chordsDiagrams,
      semitones,
      flats,
    ),
  }
}
