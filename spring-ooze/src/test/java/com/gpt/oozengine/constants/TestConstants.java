package com.gpt.oozengine.constants;

import com.gpt.oozengine.constant.DiceModifiers;
import lombok.AllArgsConstructor;

import java.util.EnumSet;

@AllArgsConstructor
public class TestConstants {
    public static final EnumSet<DiceModifiers> ADVANTAGE = EnumSet.of(DiceModifiers.ADVANTAGE);
    public static final EnumSet<DiceModifiers> DISADVANTAGE = EnumSet.of(DiceModifiers.DISADVANTAGE);
    public static final EnumSet<DiceModifiers> ADVANTAGE_AND_DISADVANTAGE = EnumSet.of(
            DiceModifiers.ADVANTAGE,
            DiceModifiers.DISADVANTAGE
    );

    public static final int SAMPLE_SIZE = 10_000;
    public static final double TOLERANCE_PERCENT = 5.0;
}
