package com.gpt.springbonk.service;


import com.gpt.springbonk.constant.enumeration.TieBreaker;
import com.gpt.springbonk.model.BallotBox;
import com.gpt.springbonk.model.Candidate;
import com.gpt.springbonk.model.Vote;
import com.gpt.springbonk.model.VoteCount;
import com.gpt.springbonk.security.keycloak.KeycloakUser;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class RankedChoiceProcessor
{
    public static BallotBox processCandidates(Set<Candidate> candidates)
    {
        BallotBox ballotBox = new BallotBox();

        // First, add all candidates to the ballot box
        for (Candidate candidate : candidates)
        {
            ballotBox.addCandidate(candidate);
        }

        // Process all votes
        Map<KeycloakUser, List<Vote>> votesByVoter = candidates.stream()
                                                               .flatMap(candidate -> candidate.getVotes().stream())
                                                               .collect(Collectors.groupingBy(Vote::getVoter));

        // For each voter, create an ordered list of candidate preferences
        for (Map.Entry<KeycloakUser, List<Vote>> entry : votesByVoter.entrySet())
        {
            List<UUID> orderedPreferences = entry.getValue().stream()
                                                 .sorted(Comparator.comparing(Vote::getRank))
                                                 .map(vote -> vote.getCandidate().getId()).toList();

            ballotBox.addBallot(entry.getKey(), orderedPreferences);
        }

        return ballotBox;
    }

    public static UUID breakTie(
        BallotBox ballotBox,
        Set<UUID> tiedCandidates,
        List<VoteCount> previousRounds,
        TieBreaker tieBreaker
    )
    {
        switch (tieBreaker)
        {
            case LOOK_BEHIND:
                if (!previousRounds.isEmpty())
                {
                    VoteCount previousRound = previousRounds.get(previousRounds.size() - 1);
                    return tiedCandidates.stream()
                                         .min(Comparator.comparingInt(c ->
                                             previousRound.getCurrentVotes().getOrDefault(c, 0)))
                                         .orElseThrow();
                }
                // Fall through to deterministic random if no previous rounds

            case LOOK_AHEAD:
                Map<UUID, Integer> nextPreferenceCount = new HashMap<>();
                for (List<UUID> ballot : ballotBox.getBallots().values())
                {
                    boolean countNext = false;
                    for (UUID candidateId : ballot)
                    {
                        if (countNext && !tiedCandidates.contains(candidateId))
                        {
                            nextPreferenceCount.merge(candidateId, 1, Integer::sum);
                            break;
                        }
                        if (tiedCandidates.contains(candidateId))
                        {
                            countNext = true;
                        }
                    }
                }
                return tiedCandidates.stream()
                                     .min(Comparator.comparingInt(c ->
                                         nextPreferenceCount.getOrDefault(c, 0)))
                                     .orElseThrow();

            case REGISTRATION_TIME:
                return tiedCandidates.stream()
                                     .min(Comparator.comparing(c ->
                                         ballotBox.getCandidates().get(c).getCreatedDate()))
                                     .orElseThrow();

            case DETERMINISTIC_RANDOM:
            default:
                // Create deterministic seed from candidate IDs
                String seedStr = tiedCandidates.stream()
                                               .sorted()
                                               .map(UUID::toString)
                                               .collect(Collectors.joining());
                Random random = new Random(seedStr.hashCode());

                // Convert the set to list for indexed access
                List<UUID> candidateList = new ArrayList<>(tiedCandidates);
                return candidateList.get(random.nextInt(candidateList.size()));
        }
    }

    public static VoteCount countRound(BallotBox ballotBox, Set<UUID> eliminatedCandidates, int roundNumber)
    {
        VoteCount voteCount = new VoteCount(roundNumber, eliminatedCandidates);

        for (List<UUID> ballot : ballotBox.getBallots().values())
        {
            // Find the first non-eliminated candidate in this voter's preferences
            for (UUID candidateId : ballot)
            {
                if (!eliminatedCandidates.contains(candidateId))
                {
                    voteCount.addVote(candidateId);
                    break;
                }
            }
        }

        return voteCount;
    }
}