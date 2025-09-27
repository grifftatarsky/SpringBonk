package com.gpt.springbonk.service.electoral;

import com.gpt.springbonk.exception.DuplicateCandidateException;
import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.keycloak.KeycloakUser;
import com.gpt.springbonk.keycloak.KeycloakUserService;
import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.Candidate;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.dto.response.CandidateResponse;
import com.gpt.springbonk.repository.CandidateRepository;
import com.gpt.springbonk.service.BookService;
import com.gpt.springbonk.service.ShelfService;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class CandidateService {
  // region DI

  private final BookService bookService;
  private final ShelfService shelfService;
  private final ElectionService electionService;
  private final KeycloakUserService keycloakUserService;

  private final CandidateRepository candidateRepository;

  // endregion

  public CandidateResponse nominateCandidate(
      @NotNull UUID bookId,
      @NotNull UUID userId,
      @NotNull UUID electionId
  ) {
    // Validate the requisite parts.
    Election election = electionService.getElection(electionId);
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

  public List<CandidateResponse> getCandidatesByElection(
      @NotNull UUID electionId
  ) {
    Election election = electionService.getElection(electionId);
    return election.getCandidates()
        .stream()
        .map(CandidateResponse::new)
        .collect(Collectors.toList());
  }

  public Candidate getCandidate(UUID candidateId) {
    return candidateRepository.findById(candidateId).orElseThrow(
        () -> new ResourceNotFoundException("Candidate does not exist.")
    );
  }
}
