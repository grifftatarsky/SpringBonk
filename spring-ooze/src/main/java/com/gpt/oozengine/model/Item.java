package com.gpt.oozengine.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Weapons, armor, gear, and wondrous items. */
@Entity
@Table(name = "items")
@Getter
@Setter
@NoArgsConstructor
public class Item extends CatalogContent {

  @Column(nullable = false)
  private String name;

  /** Free-text category, e.g. "Weapon", "Armor", "Adventuring Gear". */
  @Column(nullable = false)
  private String category;

  /** Magic-item rarity, e.g. "Rare"; null for mundane items. */
  private String rarity;

  private String cost;

  private String weight;

  @Column(nullable = false)
  private boolean attunement;

  @Column(nullable = false, columnDefinition = "text")
  private String description;

  /** Mechanical notes — weapon properties, AC, damage, etc. */
  @Column(columnDefinition = "text")
  private String properties;
}
