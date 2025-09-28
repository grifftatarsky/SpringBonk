package com.gpt.springbonk.service;

import com.gpt.springbonk.model.Candidate;
import com.gpt.springbonk.model.dto.response.CandidateResponse;
import java.util.List;
import java.util.UUID;

public interface CandidateService {
  CandidateResponse nominateCandidate(UUID bookId, UUID userId, UUID electionId);

  void deleteCandidate(UUID electionId, UUID candidateId, UUID userId);

  List<CandidateResponse> getCandidatesByElection(UUID electionId);

  Candidate getCandidate(UUID candidateId);
}
