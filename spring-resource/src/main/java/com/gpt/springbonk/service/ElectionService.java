package com.gpt.springbonk.service;

import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.dto.request.ElectionRequest;
import com.gpt.springbonk.model.dto.response.ElectionResponse;
import com.gpt.springbonk.model.dto.response.ElectionResultResponse;
import com.gpt.springbonk.model.dto.response.VoteResponse;
import com.gpt.springbonk.model.record.ElectionResultRecord;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ElectionService {
  ElectionResponse createElection(ElectionRequest electionRequest, UUID userId);

  ElectionResponse updateElection(UUID electionId, ElectionRequest electionRequest, UUID userId);

  void deleteElection(UUID electionId, UUID userId);

  ElectionResponse reopenElection(UUID electionId, ZonedDateTime newEndDateTime, UUID userId);

  ElectionResponse getOneElection(UUID electionId);

  List<ElectionResponse> getAllElections();

  Page<ElectionResponse> getPagedElections(Pageable pageable);

  List<ElectionResultResponse> getElectionResults(UUID electionId);

  ElectionResultResponse getLatestElectionResult(UUID electionId);

  ElectionResultRecord runRankedChoiceElection(UUID electionId);

  Election getElection(UUID electionId);

  List<VoteResponse> getVotesByUser(UUID electionId, UUID userId);

  void closeElection(UUID electionId);

  Election createElectionAndHandleStatus(ElectionRequest request);
}
