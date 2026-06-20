import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GameStatus, LobbyGame, Seat, SeatKind } from './lobby.models';

const BASE = '/bff/dck';

/** The signed-in user, per the Decks backend. */
export interface CurrentUser {
  readonly id: string;
  readonly username: string;
}

interface SeatDto {
  index: number;
  kind: string;
  userId: string | null;
  name: string | null;
  ready: boolean;
}

interface GameDto {
  id: string;
  ownerId: string;
  ownerName: string;
  maxPlayers: number;
  decks: number;
  status: string;
  seats: SeatDto[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Lobby client for the Decks backend (spring-decks) via the BFF — same-origin,
 * so the session cookie + Angular's XSRF header flow automatically (as in the
 * ooze remote). The host's HttpClient applies when federated. Identity comes
 * from {@code /dck/me}; mutating endpoints require a signed-in user, and the
 * backend enforces host-only rules regardless of what the UI offers.
 */
@Injectable({ providedIn: 'root' })
export class LobbyService {
  private readonly http = inject(HttpClient);

  readonly currentUser = signal<CurrentUser | null>(null);
  /** True once /me has been checked (so the UI can distinguish "loading"). */
  readonly authChecked = signal(false);
  readonly openGames = signal<LobbyGame[]>([]);
  readonly myGames = signal<LobbyGame[]>([]);

  async loadMe(): Promise<CurrentUser | null> {
    try {
      const me = await firstValueFrom(this.http.get<CurrentUser>(`${BASE}/me`));
      this.currentUser.set(me);
      return me;
    } catch {
      this.currentUser.set(null);
      return null;
    } finally {
      this.authChecked.set(true);
    }
  }

  async loadOpen(): Promise<void> {
    try {
      const games = await firstValueFrom(this.http.get<GameDto[]>(`${BASE}/games/open`));
      this.openGames.set(games.map(toLobbyGame));
    } catch {
      this.openGames.set([]);
    }
  }

  async loadMine(): Promise<void> {
    if (!this.currentUser()) {
      this.myGames.set([]);
      return;
    }
    try {
      const games = await firstValueFrom(this.http.get<GameDto[]>(`${BASE}/games/mine`));
      this.myGames.set(games.map(toLobbyGame));
    } catch {
      this.myGames.set([]);
    }
  }

  getGame(id: string): Promise<LobbyGame> {
    return firstValueFrom(this.http.get<GameDto>(`${BASE}/games/${id}`)).then(toLobbyGame);
  }

  createGame(maxPlayers: number, decks: number): Promise<LobbyGame> {
    return this.post(`/games`, { maxPlayers, decks });
  }

  joinGame(id: string): Promise<LobbyGame> {
    return this.post(`/games/${id}/join`, {});
  }

  fillWithBots(id: string): Promise<LobbyGame> {
    return this.post(`/games/${id}/fill-bots`, {});
  }

  addBot(id: string, index: number): Promise<LobbyGame> {
    return this.post(`/games/${id}/seats/${index}/bot`, {});
  }

  clearSeat(id: string, index: number): Promise<LobbyGame> {
    return firstValueFrom(this.http.delete<GameDto>(`${BASE}/games/${id}/seats/${index}`)).then(toLobbyGame);
  }

  setReady(id: string, ready: boolean): Promise<LobbyGame> {
    return this.post(`/games/${id}/ready`, { ready });
  }

  startGame(id: string): Promise<LobbyGame> {
    return this.post(`/games/${id}/start`, {});
  }

  closeGame(id: string): Promise<LobbyGame> {
    return this.post(`/games/${id}/close`, {});
  }

  /** All seats filled and ready — the server enforces this too. */
  canStart(game: LobbyGame): boolean {
    return game.seats.length > 0 && game.seats.every((s) => s.kind !== 'empty' && s.ready);
  }

  private post(path: string, body: unknown): Promise<LobbyGame> {
    return firstValueFrom(this.http.post<GameDto>(`${BASE}${path}`, body)).then(toLobbyGame);
  }
}

function toLobbyGame(dto: GameDto): LobbyGame {
  return {
    id: dto.id,
    ownerId: dto.ownerId,
    host: dto.ownerName,
    maxPlayers: dto.maxPlayers,
    decks: dto.decks,
    status: dto.status.toLowerCase() as GameStatus,
    seats: dto.seats.map(toSeat),
    createdAt: Date.parse(dto.createdAt) || Date.now(),
    updatedAt: Date.parse(dto.updatedAt) || Date.now(),
  };
}

function toSeat(dto: SeatDto): Seat {
  return {
    index: dto.index,
    kind: dto.kind.toLowerCase() as SeatKind,
    userId: dto.userId,
    name: dto.name,
    ready: dto.ready,
  };
}
