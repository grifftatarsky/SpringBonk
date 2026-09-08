package com.gpt.oozengine.constant.rules;

/** What an effect does once its branch is taken. */
public enum EffectKind {
  DAMAGE,
  HEALING,
  TEMPORARY_HIT_POINTS,
  APPLY_CONDITION,
  REMOVE_CONDITION,
  MOVEMENT,
  ABILITY_SCORE_CHANGE,
  RESOURCE_CHANGE,
  SUMMON,
  AREA_TERRAIN,
  SPECIAL
}
