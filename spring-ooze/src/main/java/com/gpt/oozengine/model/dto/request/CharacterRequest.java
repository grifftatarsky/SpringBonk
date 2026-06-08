package com.gpt.oozengine.model.dto.request;

import com.gpt.oozengine.constant.CharacterKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CharacterRequest(
    @NotBlank String name,
    @NotNull CharacterKind kind,
    String species,
    String characterClass,
    String background,
    String alignment,
    Integer level,
    Integer armorClass,
    String hitPoints,
    Integer strength,
    Integer dexterity,
    Integer constitution,
    Integer intelligence,
    Integer wisdom,
    Integer charisma,
    String description,
    String notes) {}
