package com.gpt.oozengine.model.dto.request;

import jakarta.validation.constraints.NotBlank;

public record MonsterRequest(
    @NotBlank String name,
    String size,
    String creatureType,
    String alignment,
    Integer armorClass,
    String hitPoints,
    String speed,
    String challengeRating,
    Integer strength,
    Integer dexterity,
    Integer constitution,
    Integer intelligence,
    Integer wisdom,
    Integer charisma,
    String traits,
    String actions,
    String description) {}
