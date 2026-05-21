package com.gpt.springbonk.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Payload for creating or updating a {@code Post}. Tag labels are free-form
 * strings — the service resolves them to existing tags (by slug) or creates
 * new ones.
 */
public record PostRequest(
    @NotBlank @Size(max = 255) String title,
    @NotBlank @Size(max = 50000) String body,
    List<@Size(max = 64) String> tagLabels
) {
}
