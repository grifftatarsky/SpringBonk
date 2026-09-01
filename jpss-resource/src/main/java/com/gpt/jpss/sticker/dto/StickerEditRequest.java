package com.gpt.jpss.sticker.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * The editable half of a sticker: where it sits and what it says. JSON, not
 * multipart — replacing the photo is its own endpoint, so an author fixing a
 * typo does not have to re-upload the image.
 */
public record StickerEditRequest(
    @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
    @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
    @NotBlank @Size(max = 500) String comment,
    @Size(max = 80) String place) {
}
