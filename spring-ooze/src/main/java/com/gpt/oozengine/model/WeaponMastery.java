package com.gpt.oozengine.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Weapon mastery properties — Cleave, Topple, Vex, and the rest (2024). */
@Entity
@Table(name = "weapon_masteries")
@Getter
@Setter
@NoArgsConstructor
public class WeaponMastery extends CatalogContent {

  @Column(nullable = false)
  private String name;

  @Column(nullable = false, columnDefinition = "text")
  private String description;
}
