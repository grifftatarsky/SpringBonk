package com.gpt.springbonk.service.electoral;

import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.keycloak.KeycloakUserService;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.dto.request.ElectionRequest;
import com.gpt.springbonk.model.dto.response.ElectionResponse;
import com.gpt.springbonk.model.dto.response.VoteResponse;
import com.gpt.springbonk.model.record.ElectionResultRecord;
import com.gpt.springbonk.repository.ElectionRepository;
import com.gpt.springbonk.repository.VoteRepository;
import com.gpt.springbonk.service.distribution.SingleWinnerMethodDistributionService;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemMethod.INSTANT_RUNOFF;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ElectionService {
  // region DI
  private final SingleWinnerMethodDistributionService singleWinnerMethodDistributionService;
  private final KeycloakUserService keycloakUserService;

  private final VoteRepository voteRepository;
  private final ElectionRepository electionRepository;

  // endregion

  // region C/U/D

  public ElectionResponse createElection(
      @NotNull ElectionRequest electionRequest,
      @NotNull UUID userId
  ) {
    // Should we enforce unique titles? Idk. Not now.
    Election election = new Election(
        electionRequest.getTitle(),
        electionRequest.getEndDateTime()
    );

    election.setCreator(keycloakUserService.getUserById(userId));
    return new ElectionResponse(electionRepository.saveAndFlush(election));
  }

  public ElectionResponse updateElection(
      @NotNull UUID electionId,
      @NotNull ElectionRequest electionRequest,
      @NotNull UUID userId
  ) {
    Election election = getElection(electionId);

    validateElectionCreator(election, userId);

    String newTitle = electionRequest.getTitle();
    LocalDateTime newEndDateTime = electionRequest.getEndDateTime();

    if (newTitle != null && !newTitle.equals(election.getTitle())) {
      election.setTitle(newTitle);
    }

    if (newEndDateTime != null && newEndDateTime != election.getEndDateTime()) {
      election.setEndDateTime(newEndDateTime);
    }
    // I'd like to add a line here to avoid saving an identical election update (no changes)
    return new ElectionResponse(electionRepository.saveAndFlush(election));
  }

  public void deleteElection(
      @NotNull UUID electionId,
      @NotNull UUID userId
  ) {
    Election election = getElection(electionId);

    validateElectionCreator(election, userId);
    electionRepository.delete(election);
    // TEST: Make sure this cascades to candidates and votes, and fixes shelves.
  }

  // endregion

  // region Get Methods
  public ElectionResponse getOneElection(
      @NotNull UUID electionId
  ) {
    return new ElectionResponse(getElection(electionId));
  }

  public List<ElectionResponse> getAllElections() {
    return electionRepository.findAll().stream().map(ElectionResponse::new).toList();
  }

  public Page<ElectionResponse> getPagedElections(Pageable pageable) {
    return electionRepository.findAll(pageable).map(ElectionResponse::new);
  }
  // endregion

  public ElectionResultRecord runRankedChoiceElection(
      UUID electionId
  ) {
    Election election = getElection(electionId);
    return singleWinnerMethodDistributionService.distributeByMethodology(election, INSTANT_RUNOFF);
  }

  // region Helper Methods
  public Election getElection(UUID electionId) {
    return electionRepository.findById(electionId).orElseThrow(
        () -> new ResourceNotFoundException("Election does not exist.")
    );
  }

  public List<VoteResponse> getMyVotes(
      @NotNull UUID electionId,
      @NotNull UUID userId
  ) {
    return voteRepository
        .findByVoter_IdAndCandidate_Election_IdOrderByRankAsc(userId, electionId)
        .stream()
        .map(VoteResponse::new)
        .toList();
  }
  // endregion

  // region Validation
  private void validateElectionCreator(
      @NotNull Election election,
      @NotNull UUID userId
  ) {
    if (!election.getCreator().getId().equals(userId)) {
      throw new AccessDeniedException("User did not create this election.");
    }
  }
  // endregion
}
