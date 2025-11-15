package com.gpt.springbonk.constant;

public enum ProfileAvatar {
  BOOKLING_EMERALD("bookling-emerald"),
  BOOKLING_SUNRISE("bookling-sunrise"),
  BOOKLING_LAGOON("bookling-lagoon"),
  BOOKLING_PLUM("bookling-plum"),
  BOOKLING_EMBER("bookling-ember");

  private final String assetKey;

  ProfileAvatar(String assetKey) {
    this.assetKey = assetKey;
  }

  public String getAssetKey() {
    return assetKey;
  }
}
