package com.gpt.springbonk.constant;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ProfileAvatar {
  BONKLING_EMERALD("bonkling-emerald"),
  BONKLING_SUNRISE("bonkling-sunrise"),
  BONKLING_LAGOON("bonkling-lagoon"),
  BONKLING_PLUM("bonkling-plum"),
  BONKLING_EMBER("bonkling-ember"),
  BONKLING_DIAMOND("bonkling-diamond");

  private final String assetKey;
}
