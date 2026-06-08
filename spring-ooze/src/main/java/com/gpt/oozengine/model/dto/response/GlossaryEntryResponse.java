package com.gpt.oozengine.model.dto.response;

import com.gpt.oozengine.model.GlossaryEntry;
import java.util.UUID;

public record GlossaryEntryResponse(
    UUID id, String name, String description, boolean base, UUID overridesId) {

  public static GlossaryEntryResponse from(GlossaryEntry g) {
    return new GlossaryEntryResponse(
        g.getId(), g.getName(), g.getDescription(), g.isBaseContent(), g.getOverridesId());
  }
}
