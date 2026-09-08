package com.gpt.oozengine.model.dto.request;

import com.gpt.oozengine.constant.rules.ItemCategory;
import com.gpt.oozengine.constant.rules.Rarity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ItemRequest(
    @NotBlank String name,
    @NotNull ItemCategory itemCategory,
    Rarity rarityTier,
    BigDecimal costGp,
    BigDecimal weightLb,
    boolean attunement,
    String attunementNote,
    @NotBlank String description) {}
