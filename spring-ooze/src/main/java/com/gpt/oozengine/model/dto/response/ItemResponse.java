package com.gpt.oozengine.model.dto.response;

import com.gpt.oozengine.constant.SrdVersion;
import com.gpt.oozengine.model.Item;
import java.util.UUID;

public record ItemResponse(
    UUID id,
    String name,
    String category,
    String rarity,
    String cost,
    String weight,
    boolean attunement,
    String description,
    String properties,
    boolean base,
    UUID overridesId,
    SrdVersion srdVersion) {

  public static ItemResponse from(Item i) {
    return new ItemResponse(
        i.getId(),
        i.getName(),
        i.getCategory(),
        i.getRarity(),
        i.getCost(),
        i.getWeight(),
        i.isAttunement(),
        i.getDescription(),
        i.getProperties(),
        i.isBaseContent(),
        i.getOverridesId(),
        i.getSrdVersion());
  }
}
