package com.gpt.springbonk.service;

import com.gpt.springbonk.model.Vote;
import com.gpt.springbonk.model.dto.response.VoteResponse;
import java.util.UUID;

public interface VotingService {
  VoteResponse voteForCandidate(UUID candidateId, UUID userId, Integer rank);

  void deleteVoteForCandidate(UUID candidateId, UUID userId);

  Vote getVote(UUID candidateId, UUID userId);
}
