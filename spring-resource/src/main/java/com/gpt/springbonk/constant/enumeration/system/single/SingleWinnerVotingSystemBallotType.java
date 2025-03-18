package com.gpt.springbonk.constant.enumeration.system.single;


import com.gpt.springbonk.constant.enumeration.system.VotingSystemBallotType;

public enum SingleWinnerVotingSystemBallotType implements VotingSystemBallotType
{
    SINGLE_MARK,
    RANKING,
    APPROVALS,
    SCORES,
    CREDITS,
    NONE
}
