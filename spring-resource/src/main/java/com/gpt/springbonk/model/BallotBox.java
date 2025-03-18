package com.gpt.springbonk.model;


import com.gpt.springbonk.security.keycloak.KeycloakUser;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.Data;

@Data
public class BallotBox
{
    private final Map<UUID, List<UUID>> ballots = new HashMap<>();

    private final Map<UUID, Candidate> candidates = new HashMap<>();

    public void addBallot(KeycloakUser voter, List<UUID> candidatePreferences)
    {
        ballots.put(voter.getId(), candidatePreferences);
    }

    public void addCandidate(Candidate candidate)
    {
        candidates.put(candidate.getId(), candidate);
    }

    public Map<UUID, List<UUID>> getBallots()
    {
        return Collections.unmodifiableMap(ballots);
    }

    public Map<UUID, Candidate> getCandidates()
    {
        return Collections.unmodifiableMap(candidates);
    }

    public int getTotalVotes()
    {
        return ballots.size();
    }
}