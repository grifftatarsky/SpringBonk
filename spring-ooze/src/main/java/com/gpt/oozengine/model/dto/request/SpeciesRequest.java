package com.gpt.oozengine.model.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SpeciesRequest(
    @NotBlank String name,
    String size,
    String speed,
    String creatureType,
    String traits,
    String description) {}
