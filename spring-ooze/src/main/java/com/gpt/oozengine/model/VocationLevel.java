package com.gpt.oozengine.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One row of a class's level table.
 *
 * <p>{@link #spellSlots} is keyed by spell level, so a level-5 Wizard's
 * {@code {1: 4, 2: 3, 3: 2}} is directly the resource pool the simulator spends.
 *
 * <p>{@link #classValues} is the deliberate escape hatch. Every class table has
 * columns nobody else has — Rages, Sneak Attack, Ki Points, Martial Arts die —
 * and inventing a column per class would mean a migration every time a class is
 * added, including homebrew ones. A label/value map keeps the level table
 * faithful without pretending those columns are shared.
 */
@Entity
@Table(name = "vocation_levels")
@Getter
@Setter
@NoArgsConstructor
public class VocationLevel extends BaseEntity {

  @Column(nullable = false)
  private int level;

  @Column(name = "proficiency_bonus", nullable = false)
  private int proficiencyBonus;

  @Column(name = "cantrips_known")
  private Integer cantripsKnown;

  @Column(name = "prepared_spells")
  private Integer preparedSpells;

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(
      name = "vocation_level_spell_slots",
      joinColumns = @JoinColumn(name = "vocation_level_id"))
  @MapKeyColumn(name = "slot_level")
  @Column(name = "slots", nullable = false)
  private Map<Integer, Integer> spellSlots = new TreeMap<>();

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(
      name = "vocation_level_values",
      joinColumns = @JoinColumn(name = "vocation_level_id"))
  @MapKeyColumn(name = "label", length = 64)
  @Column(name = "value", nullable = false, length = 32)
  private Map<String, String> classValues = new LinkedHashMap<>();
}
