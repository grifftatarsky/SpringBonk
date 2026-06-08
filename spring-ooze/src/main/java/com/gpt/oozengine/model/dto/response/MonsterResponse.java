package com.gpt.oozengine.model.dto.response;

import com.gpt.oozengine.model.Monster;
import java.util.UUID;

public record MonsterResponse(
    UUID id,
    String name,
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
    String description,
    boolean base,
    UUID overridesId) {

  public static MonsterResponse from(Monster m) {
    return new MonsterResponse(
        m.getId(),
        m.getName(),
        m.getSize(),
        m.getCreatureType(),
        m.getAlignment(),
        m.getArmorClass(),
        m.getHitPoints(),
        m.getSpeed(),
        m.getChallengeRating(),
        m.getStrength(),
        m.getDexterity(),
        m.getConstitution(),
        m.getIntelligence(),
        m.getWisdom(),
        m.getCharisma(),
        m.getTraits(),
        m.getActions(),
        m.getDescription(),
        m.isBaseContent(),
        m.getOverridesId());
  }
}
