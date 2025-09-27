package com.gpt.springbonk.service.electoral;

import com.gpt.springbonk.constant.enumeration.election.Status;
import com.gpt.springbonk.exception.ElectionScheduleException;
import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.keycloak.KeycloakUserService;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.ElectionResult;
import com.gpt.springbonk.model.dto.request.ElectionRequest;
import com.gpt.springbonk.model.dto.response.ElectionResponse;
import com.gpt.springbonk.model.dto.response.VoteResponse;
import com.gpt.springbonk.model.record.ElectionResultRecord;
import com.gpt.springbonk.repository.ElectionRepository;
import com.gpt.springbonk.repository.ElectionResultRepository;
import com.gpt.springbonk.repository.VoteRepository;
import com.gpt.springbonk.service.distribution.SingleWinnerMethodDistributionService;
import com.gpt.springbonk.service.schedule.event.ElectionChangedEvent;
import com.gpt.springbonk.service.schedule.event.ElectionDeletedEvent;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
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
  private final ElectionResultRepository electionResultRepository;

  private final ApplicationEventPublisher publisher;

  // endregion

  // region C/U/D

  public ElectionResponse createElection(
      @NotNull ElectionRequest electionRequest,
      @NotNull UUID userId
  ) {
    // Should we enforce unique titles? Idk. Not now.
    Election election = createElectionAndHandleStatus(electionRequest);

    election.setCreator(keycloakUserService.getUserById(userId));

    Election saved = electionRepository.saveAndFlush(election);

    publisher.publishEvent(new ElectionChangedEvent(saved.getId()));

    return new ElectionResponse(saved);
  }

  public ElectionResponse updateElection(
      @NotNull UUID electionId,
      @NotNull ElectionRequest electionRequest,
      @NotNull UUID userId
  ) {
    Election election = getElection(electionId);

    validateElectionCreator(election, userId);

    String newTitle = electionRequest.getTitle();
    ZonedDateTime newEndDateTime = electionRequest.getEndDateTime();

    if (newTitle != null && !newTitle.equals(election.getTitle())) {
      election.setTitle(newTitle);
    }

    if (newEndDateTime != null && newEndDateTime != election.getEndDateTime()) {
      election.setEndDateTime(newEndDateTime);
    }

    Election saved = electionRepository.saveAndFlush(election);

    publisher.publishEvent(new ElectionChangedEvent(saved.getId()));

    return new ElectionResponse(saved);
  }

  public void deleteElection(
      @NotNull UUID electionId,
      @NotNull UUID userId
  ) {
    // TODO TEST: Make sure this cascades and all that.

    Election election = getElection(electionId);

    validateElectionCreator(election, userId);
    electionRepository.delete(election);
    publisher.publishEvent(new ElectionDeletedEvent(election.getId()));
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

  public List<VoteResponse> getVotesByUser(
      @NotNull UUID electionId,
      @NotNull UUID userId
  ) {
    return voteRepository
        .findByVoter_IdAndCandidate_Election_IdOrderByRankAsc(userId, electionId)
        .stream()
        .map(VoteResponse::new)
        .toList();
  }

  public void closeElection(UUID electionId) {
    Election election = getElection(electionId);

    if (election.getStatus() == Status.CLOSED) return;

    if (election.getStatus() == Status.INDEFINITE) {
      throw new ElectionScheduleException("Attempted to close an indefinite Election.");
    }

    ElectionResultRecord electionResultRecord;

    try {
      electionResultRecord = runRankedChoiceElection(electionId);
    } catch (Exception e) {
      throw new ElectionScheduleException(
          "The election could not be closed due to an exception encountered during tabulation.");
    }

    ElectionResult result = new ElectionResult(electionResultRecord, ZonedDateTime.now(), election);
    electionResultRepository.saveAndFlush(result);
  }

  public Election createElectionAndHandleStatus(@Valid ElectionRequest request) {
    final ZonedDateTime endDateTime = request.getEndDateTime();
    final Instant now = Instant.now();

    if (endDateTime != null && !endDateTime.toInstant().isAfter(now)) {
      throw new ElectionScheduleException(
          "New elections cannot be created with closures in the past."
      );
    }

    final Election election = new Election(request.getTitle(), endDateTime);
    final Status status = (endDateTime == null) ? Status.INDEFINITE : Status.OPEN;
    election.setStatus(status);
    return election;
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
