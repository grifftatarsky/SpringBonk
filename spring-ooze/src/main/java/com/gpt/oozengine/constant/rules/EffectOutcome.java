package com.gpt.oozengine.constant.rules;

/**
 * Which branch of a feature's resolution an effect belongs to. The names mirror
 * the SRD's own labels — a stat block literally prints "Hit:", "Failure:",
 * "Success:" and "Failure or Success:" — so an importer maps them directly and
 * the simulator switches on them without interpretation.
 */
public enum EffectOutcome {
  ALWAYS,
  HIT,
  CRITICAL_HIT,
  MISS,
  SAVE_FAILURE,
  SAVE_SUCCESS,
  SAVE_EITHER
}
