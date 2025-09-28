package com.gpt.springbonk.service;

import com.gpt.springbonk.constant.enumeration.process.EliminationMessage;
import com.gpt.springbonk.exception.ElectionCannotBeCompletedException;
import com.gpt.springbonk.model.BallotBox;
import com.gpt.springbonk.model.Candidate;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.VoteCount;
import com.gpt.springbonk.model.record.ElectionResultRecord;
import com.gpt.springbonk.model.record.RoundResultRecord;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import static com.gpt.springbonk.constant.enumeration.process.EliminationMessage.NO_TIE_ELIMINATION_MESSAGE;
import static com.gpt.springbonk.constant.enumeration.process.EliminationMessage.TIE_ALL_WAY_TIE_ELIMINATION_MESSAGE;
import static com.gpt.springbonk.constant.enumeration.process.EliminationMessage.TIE_ELIMINATION_MESSAGE;
import static com.gpt.springbonk.constant.enumeration.process.EliminationMessage.WINNER_ATTRITION;
import static com.gpt.springbonk.constant.enumeration.process.EliminationMessage.WINNER_MAJORITY;
import static com.gpt.springbonk.exception.ElectionCannotBeCompletedException.NO_ELECTION_MESSAGE;
import static com.gpt.springbonk.util.BallotUtility.conductRound;
import static com.gpt.springbonk.util.BallotUtility.processCandidates;

@Slf4j
@Service
public class InstantRunoffService extends AbstractSingleWinnerElectionService {
  @Override
  protected BallotBox processBallots(
      List<Candidate> candidates
  ) {
    return processCandidates(candidates);
  }

  // Tested effectively ✔
  @Override
  public ElectionResultRecord conductElection(
      Election election
  ) {
    if (election == null) {
      throw new ElectionCannotBeCompletedException(NO_ELECTION_MESSAGE);
    }

    BallotBox ballotBox = processBallots(election.getCandidates());

    List<RoundResultRecord> rounds = new ArrayList<>();
    List<UUID> eliminatedCandidates = new ArrayList<>();
    int allWayTieCorrectionCount = 0;

    while (true) {
      int roundNumber = rounds.size() + 1;

      if (roundNumber != 1 && rounds.getLast()
          .eliminationMessage()
          .equals(TIE_ALL_WAY_TIE_ELIMINATION_MESSAGE)) {
        allWayTieCorrectionCount++;
      } else {
        allWayTieCorrectionCount = 0;
      }

      VoteCount voteCount =
          conductRound(ballotBox, eliminatedCandidates, roundNumber, allWayTieCorrectionCount);

      Map<UUID, Integer> currentVotes = voteCount.getCurrentVotes();
      int currentVotesSize = voteCount.getCurrentVotesSize();

      Optional<ElectionResultRecord> majorityWinner = findMajorityWinner(
          currentVotes, currentVotesSize, rounds, roundNumber
      );

      if (majorityWinner.isPresent()) {
        return majorityWinner.get();
      }

      List<UUID> candidatesWithMinVotes = getCandidatesWithMinVotes(
          ballotBox, eliminatedCandidates, currentVotes
      );

      RoundResultRecord
          roundResultRecord = getRoundResult(candidatesWithMinVotes, roundNumber, currentVotes);

      rounds.add(roundResultRecord);

      eliminatedCandidates.addAll(roundResultRecord.eliminatedCandidateIds());
    }
  }

  private RoundResultRecord getRoundResult(
      List<UUID> candidatesWithMinVotes,
      int roundNumber,
      Map<UUID, Integer> currentVotes
  ) {
    EliminationMessage eliminationReason;

    if (candidatesWithMinVotes.size() == currentVotes.size()) {
      log.debug("Detected a allWayTie round - all remaining candidates would be eliminated");
      eliminationReason = TIE_ALL_WAY_TIE_ELIMINATION_MESSAGE;
      candidatesWithMinVotes = new ArrayList<>();
    } else if (candidatesWithMinVotes.size() > 1) {
      eliminationReason = TIE_ELIMINATION_MESSAGE;
    } else {
      eliminationReason = NO_TIE_ELIMINATION_MESSAGE;
    }

    return new RoundResultRecord(
        roundNumber,
        currentVotes,
        candidatesWithMinVotes,
        eliminationReason
    );
  }

  private static Optional<ElectionResultRecord> findMajorityWinner(
      Map<UUID, Integer> currentVotes,
      int currentVotesSize,
      List<RoundResultRecord> rounds,
      int roundNumber
  ) {
    Optional<Map.Entry<UUID, Integer>> majorityWinner
        = currentVotes.entrySet()
        .stream()
        .filter(entry -> entry.getValue() > currentVotesSize / 2)
        .findFirst();

    if (majorityWinner.isPresent()) {
      rounds.add(new RoundResultRecord(
          roundNumber,
          currentVotes,
          null,
          currentVotes.size() == 1 ? WINNER_ATTRITION : WINNER_MAJORITY
      ));

      return Optional.of(new ElectionResultRecord(
          majorityWinner.get().getKey(),
          rounds,
          currentVotesSize
      ));
    } else {
      return Optional.empty();
    }
  }

  private static List<UUID> getCandidatesWithMinVotes(
      BallotBox ballotBox,
      List<UUID> eliminatedCandidates,
      Map<UUID, Integer> currentVotes
  ) {
    List<UUID> candidatesWithNoVotes
        = ballotBox.getCandidates()
        .keySet()
        .stream()
        .filter(candidateId -> !eliminatedCandidates.contains(candidateId))
        .filter(candidateId -> !currentVotes.containsKey(candidateId))
        .toList();

    if (!candidatesWithNoVotes.isEmpty()) {
      return new ArrayList<>(candidatesWithNoVotes);
    } else {
      int minVotes = currentVotes.values().stream().mapToInt(Integer::intValue).min().orElseThrow();

      return currentVotes.entrySet()
          .stream()
          .filter(entry -> entry.getValue() == minVotes)
          .map(Map.Entry::getKey)
          .toList();
    }
  }
}
