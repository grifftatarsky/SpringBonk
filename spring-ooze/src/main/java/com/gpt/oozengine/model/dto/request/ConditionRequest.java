package com.gpt.oozengine.model.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ConditionRequest(@NotBlank String name, @NotBlank String description) {}
