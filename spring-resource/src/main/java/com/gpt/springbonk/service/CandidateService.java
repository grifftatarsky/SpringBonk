package com.gpt.springbonk.service;

import com.gpt.springbonk.model.Candidate;
import com.gpt.springbonk.model.dto.response.CandidateResponse;
import java.util.List;
import java.util.UUID;

public interface CandidateService {
  CandidateResponse nominateCandidate(UUID bookId, UUID userId, UUID electionId, String pitch);

  void deleteCandidate(UUID electionId, UUID candidateId, UUID userId);

  /**
   * Update a candidate's per-election pitch. Only the nominator or the
   * election creator may edit. Pitch is independent of the book's blurb.
   */
  CandidateResponse updatePitch(UUID electionId, UUID candidateId, UUID userId, String pitch);

  List<CandidateResponse> getCandidatesByElection(UUID electionId);

  Candidate getCandidate(UUID candidateId);
}
