package com.gpt.springbonk.controller;

import com.gpt.springbonk.model.dto.request.ElectionReopenRequest;
import com.gpt.springbonk.model.dto.request.ElectionRequest;
import com.gpt.springbonk.model.dto.response.CandidateResponse;
import com.gpt.springbonk.model.dto.response.ElectionResponse;
import com.gpt.springbonk.model.dto.response.ElectionResultResponse;
import com.gpt.springbonk.model.dto.response.VoteResponse;
import com.gpt.springbonk.model.record.ElectionResultRecord;
import com.gpt.springbonk.service.CandidateService;
import com.gpt.springbonk.service.ElectionService;
import com.gpt.springbonk.service.VotingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedResourcesAssembler;
import org.springframework.hateoas.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Election Suite")
@RequestMapping("election")
public class ElectionController {
  private final ElectionService electionService;
  private final CandidateService candidateService;
  private final VotingService votingService;

  // BASICS

  @PostMapping
  @Operation(summary = "Create a new election")
  public ResponseEntity<ElectionResponse> createElection(
      @Valid @RequestBody ElectionRequest electionRequest,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    ElectionResponse createdElection = electionService.createElection(electionRequest, userId);
    return ResponseEntity.ok(createdElection);
  }

  @PutMapping("/{id}")
  @Operation(summary = "Update an existing election by ID")
  public ResponseEntity<ElectionResponse> updateElection(
      @PathVariable UUID id,
      @Valid @RequestBody ElectionRequest electionUpdateRequest,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    ElectionResponse updatedElection =
        electionService.updateElection(id, electionUpdateRequest, userId);
    return ResponseEntity.ok(updatedElection);
  }

  @PostMapping("/{id}/reopen")
  @Operation(summary = "Reopen a closed election with a new schedule")
  public ResponseEntity<ElectionResponse> reopenElection(
      @PathVariable UUID id,
      @Valid @RequestBody ElectionReopenRequest request,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    ElectionResponse reopened =
        electionService.reopenElection(id, request.getEndDateTime(), userId);
    return ResponseEntity.ok(reopened);
  }

  @DeleteMapping("/{id}")
  @Operation(summary = "Delete an existing election by ID")
  public ResponseEntity<Void> deleteElection(
      @PathVariable UUID id,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    electionService.deleteElection(id, userId);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/close")
  @Operation(summary = "Close an open election and record results immediately")
  public ResponseEntity<Void> closeElection(
      @PathVariable UUID id
  ) {
    electionService.closeElection(id);
    return ResponseEntity.ok().build();
  }

  // GETS

  @GetMapping("/all")
  @Operation(summary = "Get all available elections (unpaged)")
  public ResponseEntity<List<ElectionResponse>> getAllElections() {
    List<ElectionResponse> elections = electionService.getAllElections();
    return ResponseEntity.ok(elections);
  }

  @GetMapping
  @Operation(summary = "Get elections (paged)")
  public ResponseEntity<PagedModel<ElectionResponse>> getPagedElections(
      Pageable pageable,
      PagedResourcesAssembler assembler
  ) {
    Page<ElectionResponse> elections = electionService.getPagedElections(pageable);
    return ResponseEntity.ok(assembler.toModel(elections));
  }

  @GetMapping("/{id}")
  @Operation(summary = "Get an existing election by ID")
  public ResponseEntity<ElectionResponse> getElectionById(
      @PathVariable UUID id
  ) {
    ElectionResponse election = electionService.getOneElection(id);
    return ResponseEntity.ok(election);
  }

  @GetMapping("/{id}/results")
  @Operation(summary = "Get election results history")
  public ResponseEntity<List<ElectionResultResponse>> getElectionResults(
      @PathVariable UUID id
  ) {
    List<ElectionResultResponse> results = electionService.getElectionResults(id);
    return ResponseEntity.ok(results);
  }

  @GetMapping("/{id}/results/latest")
  @Operation(summary = "Get the most recent election result")
  public ResponseEntity<ElectionResultResponse> getLatestResult(
      @PathVariable UUID id
  ) {
    ElectionResultResponse latest = electionService.getLatestElectionResult(id);
    return ResponseEntity.ok(latest);
  }

  @GetMapping("/{id}/candidates/all")
  @Operation(summary = "Get all candidates by existing elections (unpaged)")
  public ResponseEntity<List<CandidateResponse>> getAllCandidatesByElection(
      @PathVariable UUID id
  ) {
    List<CandidateResponse> candidates = candidateService.getCandidatesByElection(id);
    return ResponseEntity.ok(candidates);
  }

  // RUN

  @GetMapping("/{id}/run")
  @Operation(summary = "Run an instant runoff (temp) election by ID")
  public ResponseEntity<ElectionResultRecord> runElection(
      @PathVariable UUID id
  ) {
    return ResponseEntity.ok(electionService.runRankedChoiceElection(id));
  }

  // CANDIDATE (TODO: Maybe move to a voting controller)

  @PostMapping("/{id}/nominate/{bookId}")
  @Operation(summary = "Nominate a candidate for an existing election")
  public ResponseEntity<CandidateResponse> nominateCandidate(
      @PathVariable UUID id,
      @PathVariable UUID bookId,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    CandidateResponse nominatedCandidate = candidateService.nominateCandidate(bookId, userId, id);
    return ResponseEntity.ok(nominatedCandidate);
  }

  @DeleteMapping("/{id}/candidate/{candidateId}")
  @Operation(summary = "Remove an existing candidate nomination from an election")
  public ResponseEntity<Void> deleteCandidate(
      @PathVariable UUID id,
      @PathVariable UUID candidateId,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    candidateService.deleteCandidate(id, candidateId, userId);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/vote/{candidateId}/{rank}")
  @Operation(summary = "Vote for an existing candidate")
  public ResponseEntity<VoteResponse> voteForCandidate(
      @PathVariable UUID candidateId,
      @PathVariable Integer rank,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    VoteResponse vote = votingService.voteForCandidate(candidateId, userId, rank);
    return ResponseEntity.ok(vote);
  }

  @DeleteMapping("/vote/{candidateId}")
  @Operation(summary = "Delete an existing vote by candidate")
  public ResponseEntity<Void> deleteVote(
      @PathVariable UUID candidateId,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    votingService.deleteVoteForCandidate(candidateId, userId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{id}/my-votes")
  @Operation(summary = "Get the current user's votes for the given election, ordered by rank")
  public ResponseEntity<List<VoteResponse>> getMyVotes(
      @PathVariable UUID id,
      @AuthenticationPrincipal Jwt jwt
  ) {
    UUID userId = UUID.fromString(jwt.getSubject());
    List<VoteResponse> votes = electionService.getVotesByUser(id, userId);
    return ResponseEntity.ok(votes);
  }
}
