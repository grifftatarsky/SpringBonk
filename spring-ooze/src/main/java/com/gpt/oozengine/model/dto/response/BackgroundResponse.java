package com.gpt.oozengine.model.dto.response;

import com.gpt.oozengine.model.Background;
import java.util.UUID;

public record BackgroundResponse(
    UUID id,
    String name,
    String abilityScores,
    String feat,
    String skillProficiencies,
    String toolProficiencies,
    String equipment,
    String description,
    boolean base,
    UUID overridesId) {

  public static BackgroundResponse from(Background b) {
    return new BackgroundResponse(
        b.getId(),
        b.getName(),
        b.getAbilityScores(),
        b.getFeat(),
        b.getSkillProficiencies(),
        b.getToolProficiencies(),
        b.getEquipment(),
        b.getDescription(),
        b.isBaseContent(),
        b.getOverridesId());
  }
}
