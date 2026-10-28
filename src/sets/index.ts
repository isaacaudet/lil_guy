import type { MachineSet } from '../item-art';
import type { GameId } from '../types';
import { set as amountle } from './amountle';
import { set as halfsies } from './halfsies';
import { set as stackdle } from './stackdle';
import { set as flipsies } from './flipsies';
import { set as puttsies } from './puttsies';
import { set as weighsies } from './weighsies';
import { set as cutsies } from './cutsies';
import { set as tiltsies } from './tiltsies';
import { set as trackdle } from './trackdle';
import { set as pets } from './pets';

/**
 * Each machine's set, one file a machine, so every game's things are drawn
 * from what is really in that game and kept in one place.
 */
export const SETS: Record<GameId, MachineSet> = { amountle, halfsies, stackdle, flipsies, puttsies, weighsies, cutsies, tiltsies, trackdle, pets };
