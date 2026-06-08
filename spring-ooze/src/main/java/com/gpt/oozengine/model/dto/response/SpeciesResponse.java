package com.gpt.oozengine.model.dto.response;

import com.gpt.oozengine.model.Species;
import java.util.UUID;

public record SpeciesResponse(
    UUID id,
    String name,
    String size,
    String speed,
    String creatureType,
    String traits,
    String description,
    boolean base,
    UUID overridesId) {

  public static SpeciesResponse from(Species s) {
    return new SpeciesResponse(
        s.getId(),
        s.getName(),
        s.getSize(),
        s.getSpeed(),
        s.getCreatureType(),
        s.getTraits(),
        s.getDescription(),
        s.isBaseContent(),
        s.getOverridesId());
  }
}
