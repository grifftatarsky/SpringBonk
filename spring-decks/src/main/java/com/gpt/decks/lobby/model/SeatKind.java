package com.gpt.decks.lobby.model;

/** What occupies a seat. HOST is seat 0 (the owner); EMPTY is unoccupied. */
public enum SeatKind {
  HOST,
  HUMAN,
  BOT,
  EMPTY
}
