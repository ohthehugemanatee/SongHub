import guitar from '@tombatossals/chords-db/lib/guitar.json'
import { UGCapo, UGChord } from '../../types/tabs'

interface DbPosition {
  frets: number[]
  fingers: number[]
  baseFret: number
  barres: number[]
}

const NATURALS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}
// chords-db's spelling of roots (object keys) and of slash-chord basses (suffixes).
const DB_ROOTS = [
  'C',
  'Csharp',
  'D',
  'Eb',
  'E',
  'F',
  'Fsharp',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
]
const DB_BASSES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'Bb',
  'B',
]
const SUFFIX_ALIASES: Record<string, string> = {
  '': 'major',
  m: 'minor',
  min: 'minor',
  M7: 'maj7',
  mM7: 'mmaj7',
  sus: 'sus4',
  '+': 'aug',
  '(add9)': 'add9',
  'm(add9)': 'madd9',
}
const CHORD_RE = /^([A-G])([#b]?)([^/]*)(?:\/([A-G][#b]?))?$/

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

function pitchClass(letter: string, accidental = ''): number {
  return mod12(
    NATURALS[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0),
  )
}

function toUGChord(p: DbPosition): UGChord {
  const offset = p.baseFret - 1
  const frets = p.frets.map((f) => (f > 0 ? f + offset : f))
  const listCapos: UGCapo[] = p.barres.map((barre) => {
    const strings = p.frets.flatMap((f, i) => (f === barre ? [i] : []))
    return {
      fret: barre + offset,
      startString: strings[0],
      lastString: strings[strings.length - 1],
      finger: p.fingers[strings[0]],
    }
  })
  return { frets, fingers: p.fingers, fret: p.baseFret, listCapos }
}

/** Voicings for a chord name from chords-db, in UG's format; undefined if it has none. */
export function voicingsFor(chord: string): UGChord[] | undefined {
  const m = CHORD_RE.exec(chord.trim())
  if (!m) return undefined
  let suffix = SUFFIX_ALIASES[m[3]] ?? m[3]
  if (m[4]) {
    const bass = DB_BASSES[pitchClass(m[4][0], m[4].slice(1))]
    if (suffix !== 'major' && suffix !== 'minor') return undefined
    suffix = `${suffix === 'minor' ? 'm' : ''}/${bass}`
  }
  const entries: { suffix: string; positions: DbPosition[] }[] =
    guitar.chords[DB_ROOTS[pitchClass(m[1], m[2])]]
  return entries.find((e) => e.suffix === suffix)?.positions.map(toUGChord)
}

/**
 * Moves a voicing `semitones` along the neck. Open strings become a barre,
 * so the shape is never lowered past the nut.
 */
export function shiftVoicing(v: UGChord, semitones: number): UGChord {
  const up = mod12(semitones)
  const fretted = v.frets.filter((f) => f > 0)
  const openStrings = v.frets.flatMap((f, i) => (f === 0 ? [i] : []))
  const k =
    !openStrings.length && fretted.length && Math.min(...fretted) + up - 12 >= 1
      ? up - 12
      : up
  const frets = v.frets.map((f) => (f < 0 ? f : f + k))
  return {
    frets,
    fingers: openStrings.length ? frets.map(() => 0) : v.fingers,
    fret: Math.min(...frets.filter((f) => f > 0)),
    listCapos: openStrings.length
      ? [
          {
            fret: k,
            startString: openStrings[0],
            lastString: openStrings[openStrings.length - 1],
            finger: 1,
          },
        ]
      : (v.listCapos || []).map((c) => ({ ...c, fret: c.fret + k })),
  }
}
