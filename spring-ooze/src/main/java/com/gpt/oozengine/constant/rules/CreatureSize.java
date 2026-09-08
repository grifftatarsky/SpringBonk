package com.gpt.oozengine.constant.rules;

/** Creature sizes. {@code spaceFeet} is the square a creature of this size occupies,
 * which the simulator needs for reach, areas of effect, and crowding. Tiny and Small
 * both occupy a 5-foot square despite differing in size category. */
public enum CreatureSize {
  TINY(2.5),
  SMALL(5),
  MEDIUM(5),
  LARGE(10),
  HUGE(15),
  GARGANTUAN(20);

  private final double spaceFeet;

  CreatureSize(double spaceFeet) {
    this.spaceFeet = spaceFeet;
  }

  public double spaceFeet() {
    return spaceFeet;
  }
}
