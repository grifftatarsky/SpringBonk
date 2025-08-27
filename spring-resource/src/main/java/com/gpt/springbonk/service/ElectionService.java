package com.gpt.springbonk.service;

import com.gpt.springbonk.exception.DuplicateCandidateException;
import com.gpt.springbonk.exception.DuplicateVoteException;
import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.keycloak.KeycloakUser;
import com.gpt.springbonk.keycloak.KeycloakUserService;
import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.Candidate;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.ElectionResult;
import com.gpt.springbonk.model.Vote;
import com.gpt.springbonk.model.dto.request.ElectionRequest;
import com.gpt.springbonk.model.dto.response.CandidateResponse;
import com.gpt.springbonk.model.dto.response.ElectionResponse;
import com.gpt.springbonk.model.dto.response.VoteResponse;
import com.gpt.springbonk.repository.CandidateRepository;
import com.gpt.springbonk.repository.ElectionRepository;
import com.gpt.springbonk.repository.VoteRepository;
import com.gpt.springbonk.service.distribution.MultipleWinnerMethodDistributionService;
import com.gpt.springbonk.service.distribution.SingleWinnerMethodDistributionService;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import static com.gpt.springbonk.constant.enumeration.system.single.SingleWinnerVotingSystemMethod.INSTANT_RUNOFF;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ElectionService {
  private final SingleWinnerMethodDistributionService singleWinnerMethodDistributionService;
  private final MultipleWinnerMethodDistributionService multipleWinnerMethodDistributionService;

  private final BookService bookService;
  private final ShelfService shelfService;
  private final KeycloakUserService keycloakUserService;

  private final VoteRepository voteRepository;
  private final ElectionRepository electionRepository;
  private final CandidateRepository candidateRepository;

  // TODO: Move basic candidate methods to their own separate service.
  public CandidateResponse nominateCandidate(
      @NotNull UUID bookId,
      @NotNull UUID userId,
      @NotNull UUID electionId
  ) {
    // Validate the requisite parts.
    Election election = getElection(electionId);
    KeycloakUser nominator = keycloakUserService.getUserById(userId);
    Book nomination = bookService.getBookById(bookId);
    // Make sure it's not nominated twice.
    if (election.getCandidates()
        .stream()
        .anyMatch(candidate -> candidate.getBook().getId().equals(bookId))) {
      throw new DuplicateCandidateException(
          "This book has already been nominated in this election.");
    }

    // Nominate?
    // Right now all users are in the elections, so we don't need to validate that yet.
    // We would also want to validate that the number of candidates doesn't exceed the number of users if we
    // stick with 1:1.
    // TODO: Add an election setting specifying the number of nominations per candidate.

    Candidate candidate = new Candidate(
        election,
        nomination,
        nominator
    );
    bookService.addBookToShelf(bookId, shelfService.getNominatedShelf(userId).getId(), userId);

    return new CandidateResponse(candidateRepository.saveAndFlush(candidate));
  }

  public void deleteCandidate(
      @NotNull UUID electionId,
      @NotNull UUID candidateId,
      @NotNull UUID userId
  ) {
    Candidate candidate = getCandidate(candidateId);
    // Ensure the candidate belongs to the election
    if (!candidate.getElection().getId().equals(electionId)) {
      throw new ResourceNotFoundException("Candidate does not belong to this election.");
    }
    // Only the nominator or the election creator can remove a nomination
    UUID nominatorId = candidate.getNominator().getId();
    UUID creatorId = candidate.getElection().getCreator().getId();
    if (!nominatorId.equals(userId) && !creatorId.equals(userId)) {
      throw new AccessDeniedException("User not permitted to remove this nomination.");
    }
    candidateRepository.delete(candidate);
  }

  // Election Methods

  public List<CandidateResponse> getCandidatesByElection(
      @NotNull UUID electionId
  ) {
    Election election = getElection(electionId);
    return election.getCandidates()
        .stream()
        .map(CandidateResponse::new)
        .collect(Collectors.toList());
  }

  // Should return a response object
  public ElectionResponse createElection(
      @NotNull ElectionRequest electionRequest,
      @NotNull UUID userId
  ) {
    // Should we enforce unique titles? Idk. Not now.
    Election election = new Election(
        electionRequest.getTitle(),
        electionRequest.getEndDateTime()
    );
    // Assign the user as the creator.
    election.setCreator(keycloakUserService.getUserById(userId));
    return new ElectionResponse(electionRepository.saveAndFlush(election));
  }

  // Get election response
  public ElectionResponse updateElection(
      @NotNull UUID electionId,
      @NotNull ElectionRequest electionRequest,
      @NotNull UUID userId
  ) {
    Election election = getElection(electionId);
    // Validate the user is the owner.
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
    // Validate the user is the owner.
    validateElectionCreator(election, userId);
    electionRepository.delete(election);
    // TEST: Make sure this cascades to candidates and votes, and fixes shelves.
  }

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

  public ElectionResult runRankedChoiceElection(
      UUID electionId
  ) {
    Election election = getElection(electionId);
    return singleWinnerMethodDistributionService.distributeByMethodology(election, INSTANT_RUNOFF);
  }

  // Voting Methods

  // This handles new and updated votes
  public VoteResponse voteForCandidate(
      @NotNull UUID candidateId,
      @NotNull UUID userId,
      @NotNull Integer rank
  ) {
    Candidate candidate = getCandidate(candidateId);
    // If the user has already voted for this candidate, update the vote. Else, new.
    Vote vote = getVote(candidateId, userId);
    if (vote == null) {
      // They are a fresh voter on this candidate.
      vote = new Vote(
          keycloakUserService.getUserById(userId),
          candidate,
          rank
      );
    } else {
      // Not fresh! Update the rank if it changed.
      if (Objects.equals(vote.getRank(), rank)) {
        throw new DuplicateVoteException(
            "A vote of this rank has already been recorded for this candidate.");
      }
      vote.setRank(rank);
    }
    return new VoteResponse(voteRepository.saveAndFlush(vote));
  }

  public void deleteVoteForCandidate(
      @NotNull UUID candidateId,
      @NotNull UUID userId
  ) {
    Vote vote = getVote(candidateId, userId);
    if (vote == null) {
      throw new ResourceNotFoundException("This user has no recorded votes for this candidate.");
    }
    voteRepository.delete(vote);
  }

  // Helper Methods
  public Election getElection(UUID electionId) {
    return electionRepository.findById(electionId).orElseThrow(
        () -> new ResourceNotFoundException("Election does not exist.")
    );
  }

  public Candidate getCandidate(UUID candidateId) {
    return candidateRepository.findById(candidateId).orElseThrow(
        () -> new ResourceNotFoundException("Candidate does not exist.")
    );
  }

  public Vote getVote(UUID candidateId, UUID userId) {
    return voteRepository.findByIdAndVoter_Id(candidateId, userId).orElse(null);
  }

  // Validation

  private void validateElectionCreator(
      @NotNull Election election,
      @NotNull UUID userId
  ) {
    if (!election.getCreator().getId().equals(userId)) {
      throw new AccessDeniedException("User did not create this election.");
    }
  }
}
