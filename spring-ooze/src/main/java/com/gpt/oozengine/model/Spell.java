package com.gpt.oozengine.model;

import com.gpt.oozengine.constant.MagicSchool;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "spells")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Spell extends BaseEntity {

    // region Basic Info
    @Column(nullable = false)
    private String name;

    /// 0 = cantrip, 1-9 = spell levels.
    @Column(nullable = false)
    private int level;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MagicSchool school;
    // endregion

    // region Casting
    @Column(name = "casting_time")
    private String castingTime;

    private String range;

    private String duration;

    @Column(nullable = false)
    private boolean concentration;

    @Column(nullable = false)
    private boolean ritual;
    // endregion

    // region Components
    @Column(name = "verbal_component", nullable = false)
    private boolean verbalComponent;

    @Column(name = "somatic_component", nullable = false)
    private boolean somaticComponent;

    @Column(name = "material_component", nullable = false)
    private boolean materialComponent;

    /// Free-text description of the material components, e.g. "a pinch of sulfur".
    @Column(name = "materials", columnDefinition = "text")
    private String materials;
    // endregion

    // region Descriptions
    @Column(nullable = false, columnDefinition = "text")
    private String description;

    /// Optional scaling text for spells that behave differently when cast using a higher-level slot.
    @Column(name = "at_higher_levels", columnDefinition = "text")
    private String atHigherLevels;
    // endregion
}
