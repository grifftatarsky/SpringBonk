package com.gpt.springbonk.service.electoral.single;


import com.gpt.springbonk.model.BallotBox;
import com.gpt.springbonk.model.Candidate;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.ElectionResult;
import java.util.List;
import java.util.UUID;

public abstract class AbstractSingleWinnerElectionService
{
    protected abstract BallotBox processBallots(
        List<Candidate> candidates
    );

    protected abstract ElectionResult conductElection(
        Election election
    );

    protected String logCandidateByBookTitle(UUID candidateId, List<Candidate> candidates)
    {
        return candidates.stream()
                         .filter(candidate -> candidate.getId().equals(candidateId))
                         .map(candidate -> candidate.getBook().getTitle())
                         .findFirst()
                         .orElse(null);
    }
}
