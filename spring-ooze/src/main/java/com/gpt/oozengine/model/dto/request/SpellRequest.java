package com.gpt.oozengine.model.dto.request;

import com.gpt.oozengine.constant.MagicSchool;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Create/update payload for a spell. The same shape edits an owned spell or
 * seeds a copy-on-write override of a base spell.
 */
public record SpellRequest(
    @NotBlank String name,
    @Min(0) @Max(9) int level,
    @NotNull MagicSchool school,
    String castingTime,
    String range,
    String duration,
    boolean concentration,
    boolean ritual,
    boolean verbalComponent,
    boolean somaticComponent,
    boolean materialComponent,
    String materials,
    @NotBlank String description,
    String atHigherLevels) {}
