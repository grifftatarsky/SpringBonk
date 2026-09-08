package com.gpt.oozengine.constant.rules;

/**
 * How a limited-use feature comes back. {@link #RECHARGE} pairs with the
 * {@code rechargeMin}/{@code rechargeMax} fields — the SRD's "(Recharge 5–6)"
 * is a d6 rolled at the start of each turn.
 */
public enum UsesReset {
  AT_WILL,
  RECHARGE,
  PER_DAY,
  SHORT_REST,
  LONG_REST,
  DAWN,
  SPECIAL
}
