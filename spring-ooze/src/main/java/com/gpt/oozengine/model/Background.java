package com.gpt.oozengine.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Character backgrounds — origins, proficiencies, and a starting feat. */
@Entity
@Table(name = "backgrounds")
@Getter
@Setter
@NoArgsConstructor
public class Background extends CatalogContent {

  @Column(nullable = false)
  private String name;

  @Column(name = "ability_scores")
  private String abilityScores;

  private String feat;

  @Column(name = "skill_proficiencies")
  private String skillProficiencies;

  @Column(name = "tool_proficiencies")
  private String toolProficiencies;

  @Column(columnDefinition = "text")
  private String equipment;

  @Column(nullable = false, columnDefinition = "text")
  private String description;
}
