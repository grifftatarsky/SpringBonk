package com.gpt.oozengine.model;

import com.gpt.oozengine.constant.CharacterKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A player character or NPC. Unlike catalog content there's no shared "base" —
 * every character belongs to the user who made it ({@code ownerId}), so this
 * extends {@link BaseEntity} directly rather than {@link CatalogContent}.
 * Named GameCharacter to avoid shadowing {@link java.lang.Character}.
 */
@Entity
@Table(name = "characters")
@Getter
@Setter
@NoArgsConstructor
public class GameCharacter extends BaseEntity {

  @Column(name = "owner_id", nullable = false)
  private UUID ownerId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private CharacterKind kind;

  @Column(nullable = false)
  private String name;

  private String species;

  @Column(name = "character_class")
  private String characterClass;

  private String background;

  private String alignment;

  private Integer level;

  @Column(name = "armor_class")
  private Integer armorClass;

  @Column(name = "hit_points")
  private String hitPoints;

  private Integer strength;
  private Integer dexterity;
  private Integer constitution;
  private Integer intelligence;
  private Integer wisdom;
  private Integer charisma;

  @Column(columnDefinition = "text")
  private String description;

  @Column(columnDefinition = "text")
  private String notes;
}
