package com.gpt.oozengine.model.dto.request;

import com.gpt.oozengine.constant.rules.Ability;
import com.gpt.oozengine.constant.rules.CasterProgression;
import jakarta.validation.constraints.NotBlank;
import java.util.Set;

public record VocationRequest(
    @NotBlank String name,
    String likes,
    String complexity,
    Integer hitDie,
    Set<Ability> primaryAbilities,
    Set<Ability> savingThrowProficiencies,
    CasterProgression casterProgression,
    Ability spellcastingAbility,
    String description) {}
