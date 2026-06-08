package com.gpt.oozengine.model.dto.request;

import jakarta.validation.constraints.NotBlank;

public record VocationRequest(
    @NotBlank String name,
    String likes,
    String primaryAbility,
    String complexity,
    String hitDie,
    String savingThrows,
    String description) {}
