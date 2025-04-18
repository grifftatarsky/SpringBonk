package com.gpt.springbonk.service;


import com.gpt.springbonk.exception.ElectionCannotBeCompletedException;
import com.gpt.springbonk.model.BallotBox;
import com.gpt.springbonk.model.Candidate;
import com.gpt.springbonk.model.Vote;
import com.gpt.springbonk.model.VoteCount;
import com.gpt.springbonk.keycloak.KeycloakUser;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import static com.gpt.springbonk.exception.ElectionCannotBeCompletedException.FULL_WAY_TIE;
import static com.gpt.springbonk.exception.ElectionCannotBeCompletedException.NO_CANDIDATES_MESSAGE;
import static com.gpt.springbonk.exception.ElectionCannotBeCompletedException.NO_VOTES_MESSAGE;

@Slf4j
@RequiredArgsConstructor
public class BallotUtility
{
    // Tested effectively ✔
    public static BallotBox processCandidates(List<Candidate> candidates)
    {
        if (candidates == null || candidates.isEmpty())
        {
            throw new ElectionCannotBeCompletedException(NO_CANDIDATES_MESSAGE);
        }

        BallotBox ballotBox = new BallotBox();

        candidates.forEach(ballotBox::addCandidate);

        Map<KeycloakUser, List<Vote>> votesByVoter = candidates.stream()
                                                               .flatMap(candidate -> candidate.getVotes().stream())
                                                               .collect(Collectors.groupingBy(Vote::getVoter));

        if (votesByVoter.isEmpty())
        {
            throw new ElectionCannotBeCompletedException(NO_VOTES_MESSAGE);
        }

        for (Map.Entry<KeycloakUser, List<Vote>> entry : votesByVoter.entrySet())
        {
            List<UUID> orderedPreferences = entry.getValue().stream()
                                                 .sorted(Comparator.comparing(Vote::getRank))
                                                 .map(vote -> vote.getCandidate().getId()).toList();

            ballotBox.addBallot(entry.getKey(), orderedPreferences);
        }

        return ballotBox;
    }

    // Tested effectively ✔
    public static VoteCount conductRound(
        BallotBox ballotBox,
        List<UUID> eliminatedCandidates,
        int roundNumber,
        int allWayTieCorrectionCount
    )
    {
        VoteCount voteCount = new VoteCount(roundNumber, eliminatedCandidates);

        ballotBox.getBallots().values().forEach(ballot -> {
            List<UUID> activeCandidatesInBallot = ballot.stream()
                                                        .filter(
                                                            candidateId -> !eliminatedCandidates.contains(candidateId))
                                                        .toList();

            if (!activeCandidatesInBallot.isEmpty())
            {
                if (allWayTieCorrectionCount >= activeCandidatesInBallot.size())
                {
                    throw new ElectionCannotBeCompletedException(FULL_WAY_TIE);
                }
                int preferenceIndex = Math.min(allWayTieCorrectionCount, activeCandidatesInBallot.size() - 1);

                voteCount.addVote(activeCandidatesInBallot.get(preferenceIndex));
            }
        });

        return voteCount;
    }
}