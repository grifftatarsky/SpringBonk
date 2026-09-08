package com.gpt.oozengine.model.dto.response;

import com.gpt.oozengine.constant.rules.Ability;
import com.gpt.oozengine.constant.rules.Activation;
import com.gpt.oozengine.constant.rules.AreaShape;
import com.gpt.oozengine.constant.rules.AttackKind;
import com.gpt.oozengine.constant.rules.Delivery;
import com.gpt.oozengine.constant.rules.UsesReset;
import com.gpt.oozengine.model.mechanics.Feature;
import java.util.List;
import java.util.UUID;

/** One capability, with enough structure for a client to render it as a stat line. */
public record FeatureResponse(
    UUID id,
    String name,
    String description,
    Activation activation,
    Integer legendaryCost,
    String triggerText,
    UsesReset usesReset,
    Integer usesMax,
    Integer rechargeMin,
    Integer rechargeMax,
    Delivery delivery,
    AttackKind attackKind,
    Integer attackBonus,
    Ability saveAbility,
    Integer saveDc,
    Integer reachFeet,
    Integer rangeFeet,
    Integer rangeLongFeet,
    AreaShape areaShape,
    Integer areaSizeFeet,
    List<EffectResponse> effects) {

  public static FeatureResponse from(Feature f) {
    return new FeatureResponse(
        f.getId(),
        f.getName(),
        f.getDescription(),
        f.getActivation(),
        f.getLegendaryCost(),
        f.getTriggerText(),
        f.getUsesReset(),
        f.getUsesMax(),
        f.getRechargeMin(),
        f.getRechargeMax(),
        f.getDelivery(),
        f.getAttackKind(),
        f.getAttackBonus(),
        f.getSaveAbility(),
        f.getSaveDc(),
        f.getReachFeet(),
        f.getRangeFeet(),
        f.getRangeLongFeet(),
        f.getAreaShape(),
        f.getAreaSizeFeet(),
        f.getEffects().stream().map(EffectResponse::from).toList());
  }
}
