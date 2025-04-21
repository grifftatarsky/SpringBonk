package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.Candidate;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.Data;

@Data
public class CandidateResponse {
  private UUID id;
  // I'd love to create an extending class which can have multiple types for more flexibility.
  private SimpleBookResponse base;
  private String pitch;
  private LocalDateTime createdDate;
  private UUID electionId;
  private UUID nominatorId;
  private Set<VoteResponse> votes;

  public CandidateResponse(Candidate candidate) {
    this.id = candidate.getId();
    this.pitch = candidate.getPitch();
    this.base = new SimpleBookResponse(candidate.getBook());
    this.createdDate = candidate.getCreatedDate();
    this.nominatorId = candidate.getNominator().getId();
    this.electionId = candidate.getElection().getId();
    this.votes = candidate.getVotes().stream()
        .map(VoteResponse::new)
        .collect(Collectors.toSet());
  }
}
