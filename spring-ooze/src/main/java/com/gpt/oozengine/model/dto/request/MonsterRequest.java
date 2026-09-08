package com.gpt.oozengine.model.dto.request;

import com.gpt.oozengine.constant.rules.Alignment;
import com.gpt.oozengine.constant.rules.CreatureSize;
import com.gpt.oozengine.constant.rules.CreatureType;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

/**
 * The editable surface of a monster.
 *
 * <p>Flat rather than nested: this is what the finder's generic form can produce,
 * and it covers the header of a stat block. Features, senses, resistances and the
 * rest are structured data with their own editors to come — they are not lost by
 * a save through this shape, because the service only writes the fields present
 * here and leaves the collections alone.
 */
public record MonsterRequest(
    @NotBlank String name,
    String description,
    CreatureSize size,
    CreatureType creatureType,
    String creatureSubtype,
    Alignment alignment,
    Integer armorClass,
    Integer initiativeBonus,
    Integer hitPointsAverage,
    Integer hitPointsDiceCount,
    Integer hitPointsDiceFaces,
    Integer hitPointsDiceBonus,
    Integer walkSpeed,
    Integer flySpeed,
    Integer swimSpeed,
    Integer climbSpeed,
    Integer burrowSpeed,
    Integer strength,
    Integer dexterity,
    Integer constitution,
    Integer intelligence,
    Integer wisdom,
    Integer charisma,
    Integer passivePerception,
    String languages,
    BigDecimal challengeRating,
    Integer experiencePoints,
    Integer proficiencyBonus) {}
