package com.gpt.springbonk.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewCommentRequest(
    @NotBlank @Size(max = 2000) String body
) {
}
