package com.gpt.oozengine.model.dto.response;

import com.gpt.oozengine.model.WeaponMastery;
import java.util.UUID;

public record WeaponMasteryResponse(
    UUID id, String name, String description, boolean base, UUID overridesId) {

  public static WeaponMasteryResponse from(WeaponMastery w) {
    return new WeaponMasteryResponse(
        w.getId(), w.getName(), w.getDescription(), w.isBaseContent(), w.getOverridesId());
  }
}
