package com.gpt.oozengine.model.dto.response;

import com.gpt.oozengine.constant.SrdVersion;
import com.gpt.oozengine.constant.rules.ItemCategory;
import com.gpt.oozengine.constant.rules.Rarity;
import com.gpt.oozengine.model.Item;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ItemResponse(
    UUID id,
    String name,
    ItemCategory itemCategory,
    Rarity rarityTier,
    BigDecimal costGp,
    BigDecimal weightLb,
    boolean attunement,
    String attunementNote,
    String description,
    String weaponDamage,
    String weaponDamageType,
    List<String> weaponProperties,
    String masteryName,
    UUID masteryId,
    Integer baseArmorClass,
    String armorCategory,
    List<FeatureResponse> features,
    boolean base,
    UUID overridesId,
    SrdVersion srdVersion) {

  public static ItemResponse from(Item i) {
    var w = i.getWeapon();
    var a = i.getArmor();
    return new ItemResponse(
        i.getId(),
        i.getName(),
        i.getItemCategory(),
        i.getRarityTier(),
        i.getCostGp(),
        i.getWeightLb(),
        i.isAttunement(),
        i.getAttunementNote(),
        i.getDescription(),
        w == null || w.getDamage() == null ? null : w.getDamage().expression(),
        w == null || w.getDamageType() == null ? null : w.getDamageType().name(),
        w == null ? List.of() : w.getProperties().stream().map(Enum::name).sorted().toList(),
        w == null || w.getMastery() == null ? null : w.getMastery().getName(),
        w == null || w.getMastery() == null ? null : w.getMastery().getId(),
        a == null ? null : a.getBaseArmorClass(),
        a == null || a.getCategory() == null ? null : a.getCategory().name(),
        i.getFeatures().stream().map(FeatureResponse::from).toList(),
        i.isBaseContent(),
        i.getOverridesId(),
        i.getSrdVersion());
  }
}
