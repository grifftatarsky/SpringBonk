package com.gpt.oozengine.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/// AKA Class, but this is Java, so that's a no-no.
@Entity
@Table(name = "vocations")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Vocation extends CatalogContent {

    // region Basic Info
    @Column(nullable = false)
    private String name;

    private String likes;

    @Column(name = "primary_ability")
    private String primaryAbility;

    private String complexity;

    @Column(name = "hit_die")
    private String hitDie;

    @Column(name = "saving_throws")
    private String savingThrows;

    @Column(columnDefinition = "text")
    private String description;
    // endregion
}

/*
 * Possibilities:
 * - Barbarian
 * - Bard
 * - Cleric
 * - Druid
 * - Fighter
 * - Monk
 * - Paladin
 * - Ranger
 * - Rogue
 * - Sorcerer
 * - Warlock
 * - Wizard
 */
