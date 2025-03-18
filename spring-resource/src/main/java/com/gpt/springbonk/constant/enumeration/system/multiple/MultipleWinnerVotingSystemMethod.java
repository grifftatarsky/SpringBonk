package com.gpt.springbonk.constant.enumeration.system.multiple;


import java.util.EnumSet;
import lombok.Getter;

import static com.gpt.springbonk.constant.enumeration.system.multiple.MultipleWinnerVotingSystemBallotType.SINGLE_MARK;
import static com.gpt.springbonk.constant.enumeration.system.multiple.MultipleWinnerVotingSystemCriterion.MONOTONE;
import static com.gpt.springbonk.constant.enumeration.system.multiple.MultipleWinnerVotingSystemCriterion.PROPORTIONAL;

@Getter
public enum MultipleWinnerVotingSystemMethod
    // TODO: This isn't working with my @Getter for some reason; I'd like to fix this. It works in my AWIPS code.
    //implements VotingSystemMethod
{
    // TODO: Build out (https://en.wikipedia.org/wiki/Comparison_of_voting_rules#cite_note-IIA_rating_methods-31)

    SEQUENTIAL_PROPORTIONAL_APPROVAL(
        SINGLE_MARK,
        EnumSet.of(PROPORTIONAL, MONOTONE)
    );

    private final MultipleWinnerVotingSystemBallotType ballotType;

    private final EnumSet<MultipleWinnerVotingSystemCriterion> fulfilledCriteria;

    MultipleWinnerVotingSystemMethod(
        MultipleWinnerVotingSystemBallotType ballotType,
        EnumSet<MultipleWinnerVotingSystemCriterion> fulfilledCriteria
    )
    {
        this.ballotType = ballotType;
        this.fulfilledCriteria = fulfilledCriteria;
    }
}
