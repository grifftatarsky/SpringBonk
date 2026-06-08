package com.gpt.oozengine.model.dto.request;

import jakarta.validation.constraints.NotBlank;

public record BackgroundRequest(
    @NotBlank String name,
    String abilityScores,
    String feat,
    String skillProficiencies,
    String toolProficiencies,
    String equipment,
    @NotBlank String description) {}
