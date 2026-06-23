package com.gpt.decks.engine.president;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Role {
  PRESIDENT("president"),
  VICE_PRESIDENT("vice-president"),
  CITIZEN("citizen"),
  VICE_ASSHOLE("vice-asshole"),
  ASSHOLE("asshole");

  private final String label;

  Role(String label) {
    this.label = label;
  }

  @JsonValue
  public String label() {
    return label;
  }
}
