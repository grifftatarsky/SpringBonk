package com.gpt.oozengine.model.dto.request;

import jakarta.validation.constraints.NotBlank;

public record FeatRequest(
    @NotBlank String name,
    @NotBlank String featCategory,
    String prerequisite,
    @NotBlank String description) {}
