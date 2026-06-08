package com.gpt.oozengine.model.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ItemRequest(
    @NotBlank String name,
    @NotBlank String category,
    String rarity,
    String cost,
    String weight,
    boolean attunement,
    @NotBlank String description,
    String properties) {}
