package com.gpt.springbonk.exception;


public class ElectionCannotBeCompletedException extends RuntimeException
{
    public final static String NO_ELECTION_MESSAGE = "Election cannot proceed without a specified election";
    public final static String NO_CANDIDATES_MESSAGE = "Election cannot proceed without any candidates.";
    public final static String NO_VOTES_MESSAGE = "Election cannot proceed without any votes.";
    public final static String FULL_WAY_TIE = "Election cannot proceed with a full way tie.";

    public ElectionCannotBeCompletedException(String message)
    {
        super(message);
    }
}
