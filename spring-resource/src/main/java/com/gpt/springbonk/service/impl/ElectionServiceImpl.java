package com.gpt.springbonk.service.impl;

import com.gpt.springbonk.constant.enumeration.election.Flag;
import com.gpt.springbonk.constant.enumeration.election.Status;
import com.gpt.springbonk.exception.ElectionScheduleException;
import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.keycloak.KeycloakUserService;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.ElectionResult;
import com.gpt.springbonk.model.dto.request.ElectionRequest;
import com.gpt.springbonk.model.dto.response.ElectionResponse;
import com.gpt.springbonk.model.dto.response.ElectionResultResponse;
import com.gpt.springbonk.model.dto.response.VoteResponse;
import com.gpt.springbonk.model.record.ElectionResultRecord;
import com.gpt.springbonk.repository.ElectionRepository;
import com.gpt.springbonk.repository.ElectionResultRepository;
import com.gpt.springbonk.repository.VoteRepository;
import com.gpt.springbonk.service.ElectionService;
import com.gpt.springbonk.service.SingleWinnerMethodDistributionService;
import com.gpt.springbonk.service.event.ElectionChangedEvent;
import com.gpt.springbonk.service.event.ElectionDeletedEvent;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Objects;
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
public class ElectionServiceImpl implements ElectionService {
  // region DI
  private final SingleWinnerMethodDistributionService singleWinnerMethodDistributionService;
  private final KeycloakUserService keycloakUserService;

  private final VoteRepository voteRepository;
  private final ElectionRepository electionRepository;
  private final ElectionResultRepository electionResultRepository;

  private final ApplicationEventPublisher publisher;

  // endregion

  // region C/U/D

  @Override
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

  @Override
  public ElectionResponse updateElection(
      @NotNull UUID electionId,
      @NotNull ElectionRequest electionRequest,
      @NotNull UUID userId
  ) {
    Election election = getElection(electionId);

    validateElectionCreator(election, userId);

    if (election.getStatus() == Status.CLOSED) {
      throw new ElectionScheduleException(
          "Closed elections cannot be edited. Reopen the election first."
      );
    }

    boolean dirty = false;

    String newTitle = electionRequest.getTitle();
    if (newTitle != null) {
      String trimmedTitle = newTitle.trim();
      if (!trimmedTitle.equals(election.getTitle())) {
        election.setTitle(trimmedTitle);
        dirty = true;
      }
    }

    ZonedDateTime requestedEnd = electionRequest.getEndDateTime();
    ZonedDateTime currentEnd = election.getEndDateTime();
    boolean endDateChanged = !Objects.equals(requestedEnd, currentEnd);

    if (endDateChanged) {
      if (requestedEnd != null) {
        ensureFuture(requestedEnd,
            "Election closure must be scheduled for a future date and time.");
        election.setEndDateTime(requestedEnd);
        election.setStatus(Status.OPEN);
      } else {
        election.setEndDateTime(null);
        election.setStatus(Status.INDEFINITE);
      }
      dirty = true;
    }

    if (!dirty) {
      return new ElectionResponse(election);
    }

    log.info("[ElectionService] Updating election {} -> status {}", electionId,
        election.getStatus());
    Election saved = electionRepository.saveAndFlush(election);

    publisher.publishEvent(new ElectionChangedEvent(saved.getId()));

    return new ElectionResponse(saved);
  }

  @Override
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

  @Override
  public ElectionResponse reopenElection(
      @NotNull UUID electionId,
      @NotNull ZonedDateTime newEndDateTime,
      @NotNull UUID userId
  ) {
    Election election = getElection(electionId);

    validateElectionCreator(election, userId);

    if (election.getStatus() != Status.CLOSED) {
      throw new ElectionScheduleException("Only closed elections can be reopened.");
    }

    ensureFuture(newEndDateTime,
        "Reopened elections must close at a future date and time.");

    election.setEndDateTime(newEndDateTime);
    election.setStatus(Status.OPEN);

    log.info("[ElectionService] Reopening election {} with new end date {}", electionId,
        newEndDateTime);

    Election saved = electionRepository.saveAndFlush(election);

    publisher.publishEvent(new ElectionChangedEvent(saved.getId()));

    return new ElectionResponse(saved);
  }

  // endregion

  // region Get Methods
  @Override
  public ElectionResponse getOneElection(
      @NotNull UUID electionId
  ) {
    return new ElectionResponse(getElection(electionId));
  }

  @Override
  public List<ElectionResponse> getAllElections() {
    return electionRepository.findAll().stream().map(ElectionResponse::new).toList();
  }

  @Override
  public Page<ElectionResponse> getPagedElections(Pageable pageable) {
    return electionRepository.findAll(pageable).map(ElectionResponse::new);
  }

  @Override
  public List<ElectionResultResponse> getElectionResults(@NotNull UUID electionId) {
    // Ensure election exists for consistent 404 semantics.
    getElection(electionId);
    List<ElectionResultResponse> results = electionResultRepository
        .findAllByElection_IdOrderByClosureTimeDesc(electionId)
        .stream()
        .map(ElectionResultResponse::new)
        .toList();
    log.info("[ElectionService] Loaded {} historical results for election {}", results.size(),
        electionId);
    return results;
  }

  @Override
  public ElectionResultResponse getLatestElectionResult(@NotNull UUID electionId) {
    getElection(electionId);
    return electionResultRepository
        .findFirstByElection_IdOrderByClosureTimeDesc(electionId)
        .map(result -> {
          log.info("[ElectionService] Loaded latest result {} for election {}", result.getId(),
              electionId);
          return new ElectionResultResponse(result);
        })
        .orElseThrow(() ->
            new ResourceNotFoundException("Election result does not exist for this election."));
  }
  // endregion

  @Override
  public ElectionResultRecord runRankedChoiceElection(
      UUID electionId
  ) {
    Election election = getElection(electionId);
    return singleWinnerMethodDistributionService.distributeByMethodology(election, INSTANT_RUNOFF);
  }

  // region Helper Methods
  @Override
  public Election getElection(UUID electionId) {
    return electionRepository.findById(electionId).orElseThrow(
        () -> new ResourceNotFoundException("Election does not exist.")
    );
  }

  @Override
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

  @Override
  public void closeElection(UUID electionId) {
    Election election = getElection(electionId);

    if (election.getStatus() == Status.CLOSED) return;

    if (election.getStatus() == Status.INDEFINITE) {
      throw new ElectionScheduleException("Attempted to close an indefinite Election.");
    }

    // TODO: This may not be my best code...
    ElectionResultRecord electionResultRecord;
    ElectionResult result;

    try {
      electionResultRecord = runRankedChoiceElection(electionId);
      result = new ElectionResult(electionResultRecord, ZonedDateTime.now(), election);
    } catch (Exception e) {
      result = new ElectionResult(Flag.SCHEDULING_ERROR, ZonedDateTime.now(), election);
      log.error(
          "A flagged result has been created due to an exception encountered during tabulation.",
          e
      );
    }

    electionResultRepository.saveAndFlush(result);

    election.setStatus(Status.CLOSED);
    electionRepository.saveAndFlush(election);
  }

  @Override
  public Election createElectionAndHandleStatus(@Valid ElectionRequest request) {
    final ZonedDateTime endDateTime = request.getEndDateTime();
    if (endDateTime != null) {
      ensureFuture(endDateTime,
          "New elections cannot be created with closures in the past.");
    }

    final Election election = new Election(request.getTitle(), endDateTime);
    final Status status = (endDateTime == null) ? Status.INDEFINITE : Status.OPEN;
    election.setStatus(status);
    return election;
  }

  // endregion

  private void ensureFuture(ZonedDateTime endDateTime, String message) {
    if (!endDateTime.toInstant().isAfter(Instant.now())) {
      throw new ElectionScheduleException(message);
    }
  }

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
