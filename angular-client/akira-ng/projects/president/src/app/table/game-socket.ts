import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Client } from '@stomp/stompjs';
import { Action, GameEvent } from '../game/actions';
import { GameState } from '../game/state';
import { GameTransport } from './president-game';

/**
 * Live game channel over STOMP/WebSocket. Auth can't ride the WS handshake (the
 * BFF keeps the JWT server-side), so before each connect we mint a one-time
 * ticket over the authenticated HTTP path and hand it to the server in the STOMP
 * CONNECT frame — fetched in {@link Client.beforeConnect} so reconnects re-auth
 * too. We subscribe to a private queue for our redacted state and the public
 * topic for events; commands publish to the app destinations.
 */
export class GameSocket implements GameTransport {
  private client: Client | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly gameId: string,
  ) {}

  async connect(
    onState: (view: GameState) => void,
    onEvents: (events: readonly GameEvent[]) => void,
  ): Promise<void> {
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${scheme}://${location.host}/dck-ws/ws`;

    await new Promise<void>((resolve, reject) => {
      // Settle exactly once. Without this the connect could hang forever — e.g.
      // if the ticket fetch in beforeConnect throws, stompjs neither connects
      // nor fires an error, so the timeout is the backstop.
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;
      const finish = (fn: () => void) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          fn();
        }
      };
      timer = setTimeout(() => finish(() => reject(new Error('Timed out reaching the game server.'))), 8000);

      let client: Client;
      client = new Client({
        brokerURL: url,
        reconnectDelay: 4000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        beforeConnect: async () => {
          try {
            const { ticket } = await firstValueFrom(
              this.http.post<{ ticket: string }>('/bff/dck/ws-ticket', {}),
            );
            client.connectHeaders = { ticket };
          } catch (err) {
            finish(() => reject(new Error('Could not authorize the game connection.')));
            throw err; // abort this connection attempt
          }
        },
        onConnect: () => {
          client.subscribe(`/user/queue/games/${this.gameId}`, (msg) =>
            onState(JSON.parse(msg.body) as GameState),
          );
          client.subscribe(`/topic/games/${this.gameId}`, (msg) =>
            onEvents([JSON.parse(msg.body) as GameEvent]),
          );
          finish(resolve);
        },
        onStompError: (frame) =>
          finish(() => reject(new Error(frame.headers['message'] ?? 'STOMP error'))),
        onWebSocketError: () => finish(() => reject(new Error('WebSocket connection failed.'))),
      });
      this.client = client;
      client.activate();
    });
  }

  send(action: Action): void {
    this.client?.publish({
      destination: `/app/games/${this.gameId}/command`,
      body: JSON.stringify(action),
    });
  }

  next(): void {
    this.client?.publish({ destination: `/app/games/${this.gameId}/next`, body: '{}' });
  }

  dispose(): void {
    void this.client?.deactivate();
    this.client = null;
  }
}
