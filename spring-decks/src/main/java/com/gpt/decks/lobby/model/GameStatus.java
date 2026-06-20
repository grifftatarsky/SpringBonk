package com.gpt.decks.lobby.model;

/** Lobby lifecycle: open to join → in progress → closed by the host. */
public enum GameStatus {
  WAITING,
  ACTIVE,
  CLOSED
}
