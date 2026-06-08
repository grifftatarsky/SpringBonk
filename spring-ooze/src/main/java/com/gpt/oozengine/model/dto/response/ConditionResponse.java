package com.gpt.oozengine.model.dto.response;

import com.gpt.oozengine.model.Condition;
import java.util.UUID;

public record ConditionResponse(
    UUID id, String name, String description, boolean base, UUID overridesId) {

  public static ConditionResponse from(Condition c) {
    return new ConditionResponse(
        c.getId(), c.getName(), c.getDescription(), c.isBaseContent(), c.getOverridesId());
  }
}
