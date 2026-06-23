package com.gpt.decks.engine.president;

/** A card give-back the President/VP still owes (chosen, not automatic). */
public record ExchangeDebt(String from, String to, int count) {
}
