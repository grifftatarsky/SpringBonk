package com.gpt.oozengine.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Bestiary statblocks. Numeric fields are nullable so partial stubs are fine. */
@Entity
@Table(name = "monsters")
@Getter
@Setter
@NoArgsConstructor
public class Monster extends CatalogContent {

  @Column(nullable = false)
  private String name;

  private String size;

  @Column(name = "creature_type")
  private String creatureType;

  private String alignment;

  @Column(name = "armor_class")
  private Integer armorClass;

  /** Free-text so it can carry the dice, e.g. "152 (16d10 + 64)". */
  @Column(name = "hit_points")
  private String hitPoints;

  private String speed;

  /** Free-text CR, e.g. "10" or "1/2". */
  @Column(name = "challenge_rating")
  private String challengeRating;

  private Integer strength;
  private Integer dexterity;
  private Integer constitution;
  private Integer intelligence;
  private Integer wisdom;
  private Integer charisma;

  @Column(columnDefinition = "text")
  private String traits;

  @Column(columnDefinition = "text")
  private String actions;

  @Column(columnDefinition = "text")
  private String description;
}
