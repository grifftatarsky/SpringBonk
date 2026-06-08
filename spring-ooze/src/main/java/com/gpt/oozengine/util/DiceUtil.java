package com.gpt.oozengine.util;

import com.gpt.oozengine.constant.DiceModifiers;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.concurrent.ThreadLocalRandom;

import static com.gpt.oozengine.constant.DiceConstants.*;
import static com.gpt.oozengine.constant.DiceModifiers.ADVANTAGE;
import static com.gpt.oozengine.constant.DiceModifiers.DISADVANTAGE;

@Component
public class DiceUtil {

    public int roll(int die) {
        return switch (die) {
            case D2 -> divideRoundUp(rollRaw(D4), 2);
            case D3 -> divideRoundUp(rollRaw(D6), 2);
            default -> rollRaw(die);
        };
    }

    /// Roll a die using a die, and a set of any modifiers.
    public int roll(int die, EnumSet<DiceModifiers> modifiers) {
        if (modifiers.contains(ADVANTAGE) && modifiers.contains(DISADVANTAGE)) {
            return roll(die);
        }

        if (modifiers.contains(ADVANTAGE)) {
            return Math.max(roll(die), roll(die));
        }

        if (modifiers.contains(DISADVANTAGE)) {
            return Math.min(roll(die), roll(die));
        }

        return roll(die);
    }

    private int rollRaw(int die) {
        return ThreadLocalRandom.current().nextInt(1, die + 1);
    }

    private int divideRoundUp(int value, int divisor) {
        return (value + divisor - 1) / divisor;
    }
}