package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.Vote;
import java.util.UUID;
import lombok.Data;

@Data
public class VoteResponse {
  private UUID id;
  private UUID candidateId;
  private UUID userId;
  private Integer rank;

  public VoteResponse(Vote vote) {
    this.id = vote.getId();
    this.candidateId = vote.getCandidate().getId();
    this.userId = vote.getVoter().getId();
    this.rank = vote.getRank();
  }
}
