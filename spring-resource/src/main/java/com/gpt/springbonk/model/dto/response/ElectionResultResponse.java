package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.constant.enumeration.election.Flag;
import com.gpt.springbonk.model.ElectionResult;
import com.gpt.springbonk.model.record.RoundResultRecord;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;

@Getter
public class ElectionResultResponse {
  private final UUID id;
  private final UUID winnerId;
  private final int totalVotes;
  private final List<RoundResultRecord> rounds;
  private final ZonedDateTime closureTime;
  private final List<Flag> flags;

  public ElectionResultResponse(ElectionResult result) {
    this.id = result.getId();
    this.winnerId = result.getWinnerId();
    this.totalVotes = result.getTotalVotes();
    this.rounds = result.getRounds() == null
        ? List.of()
        : new ArrayList<>(result.getRounds());
    this.closureTime = result.getClosureTime();
    this.flags = result.getFlags() == null
        ? List.of()
        : List.copyOf(result.getFlags());
  }
}
