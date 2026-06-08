package com.gpt.oozengine.model.dto.response;

import com.gpt.oozengine.model.GameCharacter;
import java.util.UUID;

/**
 * A character for the caller. Characters are always user-owned, so {@code base}
 * is always false and {@code overridesId} always null — that shape lets the
 * generic finder/panel treat them as the caller's own creations (edit/delete,
 * no hide/revert).
 */
public record CharacterResponse(
    UUID id,
    String name,
    String kind,
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
    String notes,
    boolean base,
    UUID overridesId) {

  public static CharacterResponse from(GameCharacter c) {
    return new CharacterResponse(
        c.getId(),
        c.getName(),
        c.getKind() == null ? null : c.getKind().name(),
        c.getSpecies(),
        c.getCharacterClass(),
        c.getBackground(),
        c.getAlignment(),
        c.getLevel(),
        c.getArmorClass(),
        c.getHitPoints(),
        c.getStrength(),
        c.getDexterity(),
        c.getConstitution(),
        c.getIntelligence(),
        c.getWisdom(),
        c.getCharisma(),
        c.getDescription(),
        c.getNotes(),
        false,
        null);
  }
}
