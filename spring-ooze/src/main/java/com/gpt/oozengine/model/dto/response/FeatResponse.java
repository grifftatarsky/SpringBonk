package com.gpt.oozengine.model.dto.response;

import com.gpt.oozengine.constant.SrdVersion;
import com.gpt.oozengine.model.Feat;
import java.util.UUID;

public record FeatResponse(
    UUID id,
    String name,
    String featCategory,
    String prerequisite,
    String description,
    boolean base,
    UUID overridesId,
    SrdVersion srdVersion) {

  public static FeatResponse from(Feat f) {
    return new FeatResponse(
        f.getId(),
        f.getName(),
        f.getFeatCategory(),
        f.getPrerequisite(),
        f.getDescription(),
        f.isBaseContent(),
        f.getOverridesId(),
        f.getSrdVersion());
  }
}
