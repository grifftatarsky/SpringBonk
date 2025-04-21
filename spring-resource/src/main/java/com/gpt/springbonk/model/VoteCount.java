package com.gpt.springbonk.model;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.Data;

@Data
public class VoteCount {
  private final Map<UUID, Integer> currentVotes = new HashMap<>();
  private final int roundNumber;
  private final List<UUID> eliminatedCandidates;

  public VoteCount(int roundNumber, List<UUID> eliminatedCandidates) {
    this.roundNumber = roundNumber;
    this.eliminatedCandidates = eliminatedCandidates;
  }

  public void addVote(UUID candidateId) {
    currentVotes.merge(candidateId, 1, Integer::sum);
  }

  public Map<UUID, Integer> getCurrentVotes() {
    return Collections.unmodifiableMap(currentVotes);
  }

  public List<UUID> getEliminatedCandidates() {
    return Collections.unmodifiableList(eliminatedCandidates);
  }

  public Integer getCurrentVotesSize() {
    return getCurrentVotes().values().stream().mapToInt(Integer::intValue).sum();
  }
}