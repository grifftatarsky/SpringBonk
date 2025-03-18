package com.gpt.springbonk.constant.enumeration.process;


import lombok.Getter;

@Getter
public enum EliminationMessage
{
    WINNER_MAJORITY("Winner elected by possessing greater than 50% of the votes cast in round."),
    WINNER_ATTRITION(
        "Winner did not achieve greater than 50% of the votes cast in any round, but is the only candidate remaining."
    ),

    TIE_ALL_WAY_TIE_ELIMINATION_MESSAGE("Flub round should not have eliminations"),
    TIE_ELIMINATION_MESSAGE("Eliminated after tie resolution"),
    NO_TIE_ELIMINATION_MESSAGE("Eliminated with lowest votes");

    private final String message;

    EliminationMessage(String message)
    {
        this.message = message;
    }
}
