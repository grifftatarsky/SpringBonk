package com.gpt.springbonk.model;


import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.Data;

@Data
public class VoteCount
{
    private final Map<UUID, Integer> currentVotes = new HashMap<>();
    private final int roundNumber;
    private final Set<UUID> eliminatedCandidates;

    public VoteCount(int roundNumber, Set<UUID> eliminatedCandidates)
    {
        this.roundNumber = roundNumber;
        this.eliminatedCandidates = new HashSet<>(eliminatedCandidates);
    }

    public void addVote(UUID candidateId)
    {
        currentVotes.merge(candidateId, 1, Integer::sum);
    }

    public Map<UUID, Integer> getCurrentVotes()
    {
        return Collections.unmodifiableMap(currentVotes);
    }

    public Set<UUID> getEliminatedCandidates()
    {
        return Collections.unmodifiableSet(eliminatedCandidates);
    }
}