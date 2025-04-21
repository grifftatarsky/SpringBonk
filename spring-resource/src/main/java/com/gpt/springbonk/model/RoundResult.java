package com.gpt.springbonk.model;

import com.gpt.springbonk.constant.enumeration.process.EliminationMessage;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.Data;

@Data
public class RoundResult {
  private final int roundNumber;
  private final Map<UUID, Integer> votes;
  private final List<UUID> eliminatedCandidateIds;
  private final EliminationMessage eliminationMessage;

  public RoundResult(
      int roundNumber,
      Map<UUID, Integer> votes,
      List<UUID> eliminatedCandidateIds,
      EliminationMessage eliminationMessage
  ) {
    this.roundNumber = roundNumber;
    this.votes = new HashMap<>(votes);
    this.eliminatedCandidateIds = eliminatedCandidateIds;
    this.eliminationMessage = eliminationMessage;
  }
}