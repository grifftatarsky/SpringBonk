package com.gpt.springbonk.model.record;

import com.gpt.springbonk.constant.enumeration.process.EliminationMessage;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record RoundResultRecord(int roundNumber, Map<UUID, Integer> votes,
                                List<UUID> eliminatedCandidateIds,
                                EliminationMessage eliminationMessage) {
  public RoundResultRecord(
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