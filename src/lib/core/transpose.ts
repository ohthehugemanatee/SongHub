import { KeySignatures, transpose as transposeText } from 'chord-transposer'
import { Tab, UGChordCollection } from '../../types/tabs'
import { shiftVoicing, voicingsFor } from './voicings'

const ROOT_RE = /^[A-G][#b]?/
const NOTE_RE = /(^|\/)([A-G][#b]?)/g
const CHORD_SPAN_RE = /(<span[^>]*js-chord-chord[^>]*>)([^<]*)(<\/span>)/g
const CHORD_TAG_RE = /\[ch\]([^[]*)\[\/ch\]/g
// chord-transposer spells strictly by key signature (Cb in flat keys, E# in F#),
// and uses sharps for accidentals in C/Am, where chord sheets write Bb, Eb, Ab.
const READABLE: Record<string, string> = {
  Cb: 'B',
  Fb: 'E',
  'E#': 'F',
  'B#': 'C',
}
const FLATS_IN_C: Record<string, string> = {
  'A#': 'Bb',
  'D#': 'Eb',
  'G#': 'Ab',
}

const ENHARMONIC: Record<string, string> = {
  'C#': 'Db',
  Db: 'C#',
  'D#': 'Eb',
  Eb: 'D#',
  'F#': 'Gb',
  Gb: 'F#',
  'G#': 'Ab',
  Ab: 'G#',
  'A#': 'Bb',
  Bb: 'A#',
  ...READABLE,
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

// chord-transposer silently maps unknown key names (Dbm, D#) to the wrong signature.
function isKeySignature(key: string, minor: boolean): boolean {
  const sig = KeySignatures.keySignatureMap.get(key)
  return Boolean(sig) && (minor ? sig.relativeMinor : sig.majorKey) === key
}

/** Key named by a chord's root and quality, e.g. "Cmaj7" -> "C", "Dbm7" -> "C#m". */
function keyOf(chord: string | undefined): string | undefined {
  const root = chord?.trim().match(ROOT_RE)?.[0]
  if (!root) return undefined
  const suffix = chord.trim().slice(root.length)
  const minor = suffix.startsWith('m') && !suffix.startsWith('maj')
  return [root, ENHARMONIC[root]]
    .filter(Boolean)
    .map((r) => (minor ? `${r}m` : r))
    .find((k) => isKeySignature(k, minor))
}

/** The tab's key: UG's tonality if it names a note, else the first chord in the song. */
export function tabKey(tab: Tab | undefined): string | undefined {
  if (!tab) return undefined
  const first = (re: RegExp, text: string | undefined, group: number) =>
    text ? new RegExp(re.source).exec(text)?.[group] : undefined
  return (
    keyOf(tab.tonality) ??
    keyOf(first(CHORD_TAG_RE, tab.raw_tabs, 1)) ??
    keyOf(first(CHORD_SPAN_RE, tab.htmlTab, 2))
  )
}

/** Returns a function shifting one chord name by `semitones`, spelled for the target key. */
export function chordShifter(
  key: string | undefined,
  semitones: number,
): (chord: string) => string {
  if (!key || mod12(semitones) === 0) return (chord) => chord
  const n = mod12(semitones)
  const target = transposeText(key).fromKey(key).up(n).toString()
  const toFSharp = target === 'Gb'
  const respell = {
    ...READABLE,
    ...(target === 'C' || target === 'Am' ? FLATS_IN_C : {}),
  }
  return (chord) => {
    const lead = chord.match(/^\s*/)[0]
    const trail = chord.match(/\s*$/)[0]
    const from = transposeText(chord.trim()).fromKey(key)
    const shifted = (toFSharp ? from.toKey('F#') : from.up(n)).toString()
    return (
      lead +
      shifted.replace(
        NOTE_RE,
        (_, sep, note) => sep + (respell[note] ?? note),
      ) +
      trail
    )
  }
}

/** Renames chords by `shift` and gives each the voicings of its new name. */
export function transposeChordCollection(
  chords: UGChordCollection[] | undefined,
  semitones: number,
  shift: (chord: string) => string,
): UGChordCollection[] | undefined {
  if (!chords || mod12(semitones) === 0) return chords
  const out = {}
  Object.keys(chords).forEach((key) => {
    const name = shift(key)
    out[name] =
      voicingsFor(name) ??
      (chords[key] || []).map((v) => shiftVoicing(v, semitones))
  })
  return out as UGChordCollection[]
}

/** Returns `tab` with every chord in htmlTab, raw_tabs and chordsDiagrams shifted by `semitones`. */
export function transposeTab(tab: Tab, semitones: number): Tab {
  if (!tab || mod12(semitones) === 0) return tab
  const shift = chordShifter(tabKey(tab), semitones)
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
      shift,
    ),
  }
}

/** The tab as saved: source-key content, the offset, and the transposed raw_tabs the reMarkable sync renders. */
export function tabForSave(tab: Tab, semitones: number): Tab {
  return {
    ...tab,
    transpose: semitones,
    raw_tabs_transposed: transposeTab(tab, semitones)?.raw_tabs,
  }
}
