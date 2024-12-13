package com.gpt.springbonk.model;


import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.Data;

@Data
public class RoundResult
{
    private final int roundNumber;
    private final Map<UUID, Integer> votes;
    private final UUID eliminatedCandidateId;
    private final String eliminationReason;

    public RoundResult(
        int roundNumber,
        Map<UUID, Integer> votes,
        UUID eliminatedCandidateId,
        String eliminationReason
    )
    {
        this.roundNumber = roundNumber;
        this.votes = new HashMap<>(votes);
        this.eliminatedCandidateId = eliminatedCandidateId;
        this.eliminationReason = eliminationReason;
    }
}