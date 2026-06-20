import { Combo } from './combo';
import { PlayerId, Role } from './state';

/**
 * Actions are the only way to mutate a game — the inputs a player (human or bot)
 * submits. They're plain, serializable messages, so the same type doubles as the
 * client→server command envelope when this goes online.
 */
export type Action =
  | { readonly type: 'play'; readonly playerId: PlayerId; readonly cardUids: readonly string[] }
  | { readonly type: 'pass'; readonly playerId: PlayerId }
  | { readonly type: 'exchange'; readonly playerId: PlayerId; readonly cardUids: readonly string[] };

/**
 * Events describe what happened as a result of an action — the outputs the
 * engine emits. A networked server broadcasts these (server→client) to keep
 * every client's view in sync; locally they drive animations and the bot loop.
 */
export type GameEvent =
  | { readonly type: 'played'; readonly playerId: PlayerId; readonly combo: Combo }
  | { readonly type: 'passed'; readonly playerId: PlayerId }
  | { readonly type: 'skipped'; readonly playerIds: readonly PlayerId[] }
  | { readonly type: 'trick-won'; readonly playerId: PlayerId }
  | { readonly type: 'turn-changed'; readonly playerId: PlayerId }
  | { readonly type: 'player-finished'; readonly playerId: PlayerId; readonly place: number }
  | { readonly type: 'player-bottomed'; readonly playerId: PlayerId }
  | {
      readonly type: 'round-over';
      readonly standings: readonly PlayerId[];
      readonly roles: ReadonlyMap<PlayerId, Role>;
    }
  | { readonly type: 'exchanged'; readonly from: PlayerId; readonly to: PlayerId; readonly count: number }
  | { readonly type: 'round-started'; readonly round: number; readonly leaderId: PlayerId };
