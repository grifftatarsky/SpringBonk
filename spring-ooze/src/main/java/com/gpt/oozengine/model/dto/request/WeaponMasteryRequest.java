package com.gpt.oozengine.model.dto.request;

import jakarta.validation.constraints.NotBlank;

public record WeaponMasteryRequest(@NotBlank String name, @NotBlank String description) {}
