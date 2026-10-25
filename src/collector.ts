import { FINISHES, WEAR, special, type Owned } from './owned';
import { EFFECTS } from './effects';

/**
 * What a collector looks for in a copy beyond its grade: the small facts that
 * make two copies of the same item in the same finish worth different things.
 * None of them change how rare the item is; they are why one copy of it is the
 * one people want.
 */
export interface Note {
  id: string;
  /** A short badge. */
  name: string;
  /** One line on why it matters. */
  why: string;
  /** About one copy in this many has it. */
  oneIn: number;
}

/** Prints people chase for the number alone. */
const LUCKY_PRINTS: Record<number, string> = { 7: 'Lucky 7', 100: 'Century', 404: 'Not found', 777: 'Jackpot', 999: 'Last print' };

/** Every note that applies to a copy, most wanted first. */
export function collectorNotes(o: Owned): Note[] {
  const notes: Note[] = [];
  const [lo, hi] = FINISHES[o.finish].scuffs, span = hi - lo;
  const share = (a: number, b: number) => Math.max(1e-9, (Math.min(b, hi) - Math.max(a, lo)) / span);

  // Float: the cleanest and the most worn are both prized.
  if (o.scuff < 0.001) notes.push({ id: 'triple-zero', name: '0.000 float', why: 'Cleaner than a 0.001. Almost no copy of its finish is this clean.', oneIn: 1 / share(0, 0.001) });
  else if (o.scuff < 0.01) notes.push({ id: 'double-zero', name: '0.00 float', why: 'A float under 0.01: near spotless.', oneIn: 1 / share(0, 0.01) });
  if (o.scuff > 0.99 && hi >= 1) notes.push({ id: 'max-float', name: 'Max float', why: 'As worn as a copy gets. Some collect the most battered.', oneIn: 1 / share(0.99, 1) });
  // Just over a wear line: the best copy of its condition.
  for (const w of WEAR.slice(0, -1)) {
    if (o.scuff >= w.max && o.scuff < w.max + 0.003) {
      const next = WEAR[WEAR.indexOf(w) + 1];
      notes.push({ id: 'top-of-tier', name: `Best ${next.name}`, why: `Within 0.003 of ${w.name}: about as clean as ${next.name} gets.`, oneIn: 1 / share(w.max, w.max + 0.003) });
    }
  }

  // Print: the famous patterns, then numbers people like.
  const famous = special(o);
  if (famous) notes.push({ id: 'famous-print', name: famous, why: 'A famous print: the pattern itself is rare, and lifts the copy a grade.', oneIn: famous === 'Deep Blue' ? 200 : 20 });
  if (o.print === 1) notes.push({ id: 'print-1', name: 'Print #1', why: 'The first print of any run.', oneIn: 1000 });
  else if (o.print === 0) notes.push({ id: 'print-0', name: 'Print #0', why: 'Print zero: the one before the first.', oneIn: 1000 });
  else if (LUCKY_PRINTS[o.print]) notes.push({ id: 'lucky-print', name: `#${o.print} · ${LUCKY_PRINTS[o.print]}`, why: 'A print number people collect for itself.', oneIn: 1000 });
  else if (o.print >= 111 && o.print % 111 === 0) notes.push({ id: 'triple-print', name: `#${o.print} · Triples`, why: 'Three of a kind in the print number.', oneIn: 1000 / 9 });
  else if ([123, 234, 345, 456, 567, 678, 789, 321, 432, 543, 654, 765, 876, 987].includes(o.print)) notes.push({ id: 'straight-print', name: `#${o.print} · Straight`, why: 'A run in the print number.', oneIn: 1000 / 14 });

  // An effect on top of the finish.
  if (o.fx) { const e = EFFECTS[o.fx]; notes.push({ id: 'effect', name: e.name, why: `${e.what} An effect on top of its finish.`, oneIn: FINISHES[o.finish].aura ? e.aura : e.item }); }

  // What happened to it.
  if (o.souvenir) notes.push({ id: 'souvenir', name: 'Souvenir', why: `From the free capsule for finishing every game on ${o.souvenir}. It can never be opened again.`, oneIn: 1 });
  if (o.tally !== undefined) notes.push({ id: 'tally', name: `Tally ${o.tally.toLocaleString('en-US')}`, why: 'Counts the days its owner finished their games wearing it. One copy in ten has one.', oneIn: 10 });
  if (o.pins?.length) notes.push({ id: 'pins', name: `${o.pins.length} pin${o.pins.length === 1 ? '' : 's'}`, why: 'Earned in the games and stuck on for good.', oneIn: 1 });

  return notes.sort((a, b) => b.oneIn - a.oneIn);
}
