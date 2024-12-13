package com.gpt.springbonk.model;


import java.util.List;
import java.util.UUID;
import lombok.Data;

@Data
public class ElectionResult
{
    private final UUID winnerId;
    private final List<RoundResult> rounds;
    private final int totalVotes;

    public ElectionResult(
        UUID winnerId,
        List<RoundResult> rounds,
        int totalVotes
    )
    {
        this.winnerId = winnerId;
        this.rounds = rounds;
        this.totalVotes = totalVotes;
    }
}