package com.gpt.oozengine.model;

import com.gpt.oozengine.constant.Abilities;
import jakarta.persistence.Entity;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.EnumMap;

/// AKA Class, but this is Java, so that's a no-no.
//@Entity
@Getter
@Setter
public class PlayerCharacter {
    // Basic Details
    private String firstName;
    private String fullName;
    private String background;

    private String species;
    private Vocation vocation;
    private Vocation subVocation;
    private int level;
    private int armorClass;
    private int hitPointsMax;
    private int currentHitPoints;
    private int tempHitPoints;

    // I'm gonna have to expand this significantly.
    private EnumMap<Abilities, Integer> abilityScores = new EnumMap<>(Abilities.class);

    /// Proper constructor for this.
    public PlayerCharacter(int level) {
        if (level == 0) { throw new RuntimeException("TODO: Add handling for a cannot be level 0 error.");}
        // BACKGROUND - CHP 4
        // Proficiency Bonus (chp 1, class descrip)
        // Starting equip.
        // Species
    }
}
