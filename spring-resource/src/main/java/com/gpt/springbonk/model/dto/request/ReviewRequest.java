package com.gpt.springbonk.model.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record ReviewRequest(
    UUID bookId,
    @NotBlank @Size(max = 10000) String body,
    @Min(1) @Max(5) Integer rating
) {
}
