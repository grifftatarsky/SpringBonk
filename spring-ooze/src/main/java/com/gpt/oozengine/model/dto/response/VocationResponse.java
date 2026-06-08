package com.gpt.oozengine.model.dto.response;

import com.gpt.oozengine.model.Vocation;
import java.util.UUID;

public record VocationResponse(
    UUID id,
    String name,
    String likes,
    String primaryAbility,
    String complexity,
    String hitDie,
    String savingThrows,
    String description,
    boolean base,
    UUID overridesId) {

  public static VocationResponse from(Vocation v) {
    return new VocationResponse(
        v.getId(),
        v.getName(),
        v.getLikes(),
        v.getPrimaryAbility(),
        v.getComplexity(),
        v.getHitDie(),
        v.getSavingThrows(),
        v.getDescription(),
        v.isBaseContent(),
        v.getOverridesId());
  }
}
