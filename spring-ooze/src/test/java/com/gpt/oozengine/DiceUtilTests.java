package com.gpt.oozengine;

import com.gpt.oozengine.util.DiceUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

import java.util.stream.IntStream;

import static com.gpt.oozengine.constant.DiceConstants.*;
import static com.gpt.oozengine.constants.TestConstants.*;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("DiceUtil")
class DiceUtilTests {

    private final DiceUtil diceUtil = new DiceUtil();

    @Nested
    @DisplayName("roll(int)")
    class StraightRoll {

        @RepeatedTest(100)
        @DisplayName("returns value within 1 to sides inclusive")
        void returnsValueWithinBounds() {
            assertThat(diceUtil.roll(D100)).isBetween(1, D100);
            assertThat(diceUtil.roll(D20)).isBetween(1, D20);
            assertThat(diceUtil.roll(D12)).isBetween(1, D12);
            assertThat(diceUtil.roll(D10)).isBetween(1, D10);
            assertThat(diceUtil.roll(D8)).isBetween(1, D8);
            assertThat(diceUtil.roll(D6)).isBetween(1, D6);
            assertThat(diceUtil.roll(D4)).isBetween(1, D4);
            assertThat(diceUtil.roll(D3)).isBetween(1, D3);
            assertThat(diceUtil.roll(D2)).isBetween(1, D2);
        }
    }

    @Nested
    @DisplayName("roll(int, EnumSet<DiceModifiers>)")
    class ModifiedRoll {

        @Nested
        @DisplayName("with ADVANTAGE")
        class WithAdvantage {

            @RepeatedTest(100)
            @DisplayName("returns value within bounds")
            void returnsValueWithinBounds() {
                assertThat(diceUtil.roll(D20, ADVANTAGE)).isBetween(1, D20);
            }

            @Test
            @DisplayName("skews higher than a straight roll over many samples")
            void skewsHigher() {
                double straightAvg = average(() -> diceUtil.roll(D20));
                double advantageAvg = average(() -> diceUtil.roll(D20, ADVANTAGE));

                assertThat(advantageAvg).isGreaterThan(straightAvg);
            }
        }

        @Nested
        @DisplayName("with DISADVANTAGE")
        class WithDisadvantage {

            @RepeatedTest(100)
            @DisplayName("returns value within bounds")
            void returnsValueWithinBounds() {
                assertThat(diceUtil.roll(D20, DISADVANTAGE)).isBetween(1, D20);
            }

            @Test
            @DisplayName("skews lower than a straight roll over many samples")
            void skewsLower() {
                double straightAvg = average(() -> diceUtil.roll(D20));
                double disadvantageAvg = average(() -> diceUtil.roll(D20, DISADVANTAGE));

                assertThat(disadvantageAvg).isLessThan(straightAvg);
            }
        }

        @Nested
        @DisplayName("with both ADVANTAGE and DISADVANTAGE")
        class WithBothModifiers {

            @RepeatedTest(100)
            @DisplayName("returns value within bounds")
            void returnsValueWithinBounds() {
                assertThat(diceUtil.roll(D20, ADVANTAGE_AND_DISADVANTAGE)).isBetween(1, D20);
            }

            @Test
            @DisplayName("cancels out and behaves like a straight roll")
            void cancelsOut() {
                double straightAvg = average(() -> diceUtil.roll(D20));
                double cancelledAvg = average(() -> diceUtil.roll(D20, ADVANTAGE_AND_DISADVANTAGE));

                assertThat(cancelledAvg).isCloseTo(straightAvg, withinPercentage());
            }
        }
    }

    private double average(IntSupplier roller) {
        return IntStream.generate(roller::getAsInt)
                .limit(SAMPLE_SIZE)
                .average()
                .orElseThrow();
    }

    private org.assertj.core.data.Percentage withinPercentage() {
        return org.assertj.core.data.Percentage.withPercentage(TOLERANCE_PERCENT);
    }

    @FunctionalInterface
    private interface IntSupplier {
        int getAsInt();
    }
}