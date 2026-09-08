package com.gpt.oozengine.model.dto.response;

import com.gpt.oozengine.constant.SrdVersion;
import com.gpt.oozengine.constant.rules.Ability;
import com.gpt.oozengine.constant.rules.CasterProgression;
import com.gpt.oozengine.model.Vocation;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** A class. Collections are copied out of the session — see {@link BackgroundResponse}. */
public record VocationResponse(
    UUID id,
    String name,
    Integer hitDie,
    Set<Ability> primaryAbilities,
    Set<Ability> savingThrowProficiencies,
    CasterProgression casterProgression,
    Ability spellcastingAbility,
    String likes,
    String complexity,
    String description,
    int levelCount,
    List<FeatureResponse> features,
    boolean base,
    UUID overridesId,
    SrdVersion srdVersion) {

  public static VocationResponse from(Vocation v) {
    return new VocationResponse(
        v.getId(),
        v.getName(),
        v.getHitDie(),
        Set.copyOf(v.getPrimaryAbilities()),
        Set.copyOf(v.getSavingThrowProficiencies()),
        v.getCasterProgression(),
        v.getSpellcastingAbility(),
        v.getLikes(),
        v.getComplexity(),
        v.getDescription(),
        v.getLevels().size(),
        v.getFeatures().stream().map(FeatureResponse::from).toList(),
        v.isBaseContent(),
        v.getOverridesId(),
        v.getSrdVersion());
  }
}
