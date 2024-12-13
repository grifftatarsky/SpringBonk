package com.gpt.springbonk.service;


import com.gpt.springbonk.constant.enumeration.TieBreaker;
import com.gpt.springbonk.exception.DuplicateCandidateException;
import com.gpt.springbonk.exception.DuplicateVoteException;
import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.model.BallotBox;
import com.gpt.springbonk.model.Book;
import com.gpt.springbonk.model.Candidate;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.ElectionResult;
import com.gpt.springbonk.model.RoundResult;
import com.gpt.springbonk.model.Vote;
import com.gpt.springbonk.model.VoteCount;
import com.gpt.springbonk.model.dto.request.ElectionRequest;
import com.gpt.springbonk.model.dto.response.CandidateResponse;
import com.gpt.springbonk.model.dto.response.ElectionResponse;
import com.gpt.springbonk.model.dto.response.VoteResponse;
import com.gpt.springbonk.repository.CandidateRepository;
import com.gpt.springbonk.repository.ElectionRepository;
import com.gpt.springbonk.repository.VoteRepository;
import com.gpt.springbonk.security.keycloak.KeycloakUser;
import com.gpt.springbonk.security.keycloak.KeycloakUserService;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
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
public class ElectionService
{
    // Services
    private final BookService bookService;
    private final KeycloakUserService keycloakUserService;
    private final ShelfService shelfService;
    // Repositories
    private final VoteRepository voteRepository;
    private final ElectionRepository electionRepository;
    private final CandidateRepository candidateRepository;

    // Candidate Methods

    public CandidateResponse nominateCandidate(
        @NotNull UUID bookId,
        @NotNull UUID userId,
        @NotNull UUID electionId
    )
    {
        // Validate the requisite parts.
        Election election = getElection(electionId);
        KeycloakUser nominator = keycloakUserService.getUserById(userId);
        Book nomination = bookService.getBookById(bookId);
        // Make sure it's not nominated twice.
        if (election.getCandidates().stream().anyMatch(candidate -> candidate.getBook().getId().equals(bookId)))
        {
            throw new DuplicateCandidateException("This book has already been nominated in this election.");
        }
        // Nominate?
        // Right now all users are in the elections, so we don't need to validate that yet.
        // We would also want to validate that the number of candidates doesn't exceed the number of users if we
        // stick with 1:1.
        Candidate candidate = new Candidate(
            election,
            nomination,
            nominator
        );
        bookService.addBookToShelf(bookId, shelfService.getNominatedShelf(userId).getId(), userId);

        return new CandidateResponse(candidateRepository.saveAndFlush(candidate));
    }

    // Election Methods

    public List<CandidateResponse> getCandidatesByElection(
        @NotNull UUID electionId
    )
    {
        Election election = getElection(electionId);
        return election.getCandidates().stream().map(CandidateResponse::new).collect(Collectors.toList());
    }

    // Should return a response object
    public ElectionResponse createElection(
        @NotNull ElectionRequest electionRequest,
        @NotNull UUID userId
    )
    {
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
    )
    {
        Election election = getElection(electionId);
        // Validate the user is the owner.
        validateElectionCreator(election, userId);

        String newTitle = electionRequest.getTitle();
        LocalDateTime newEndDateTime = electionRequest.getEndDateTime();

        if (newTitle != null && !newTitle.equals(election.getTitle()))
        {
            election.setTitle(newTitle);
        }

        if (newEndDateTime != null && newEndDateTime != election.getEndDateTime())
        {
            election.setEndDateTime(newEndDateTime);
        }
        // I'd like to add a line here to avoid saving an identical election update (no changes)
        return new ElectionResponse(electionRepository.saveAndFlush(election));
    }

    public void deleteElection(
        @NotNull UUID electionId,
        @NotNull UUID userId
    )
    {
        Election election = getElection(electionId);
        // Validate the user is the owner.
        validateElectionCreator(election, userId);
        electionRepository.delete(election);
        // TEST: Make sure this cascades to candidates and votes, and fixes shelves.
    }

    public ElectionResponse getOneElection(
        @NotNull UUID electionId
    )
    {
        return new ElectionResponse(getElection(electionId));
    }

    public List<ElectionResponse> getAllElections()
    {
        return electionRepository.findAll().stream().map(ElectionResponse::new).toList();
    }

    public ElectionResult runRankedChoiceElection(UUID electionId, TieBreaker tieBreakerStyle)
    {
        Election election = getElection(electionId);
        Set<Candidate> candidates = election.getCandidates();

        if (candidates.isEmpty())
        {
            throw new ResourceNotFoundException("There are no candidates in the election.");
        }

        BallotBox ballotBox = RankedChoiceProcessor.processCandidates(candidates);

        if (ballotBox.getTotalVotes() == 0)
        {
            throw new IllegalStateException("No votes have been cast in this election.");
        }

        // Track eliminated candidates and rounds
        Set<UUID> eliminatedCandidates = new HashSet<>();
        List<RoundResult> rounds = new ArrayList<>();
        List<VoteCount> voteCounts = new ArrayList<>();

        // Continue until we have a winner
        while (true)
        {
            int roundNumber = rounds.size() + 1;

            // Count votes for this round
            VoteCount voteCount =
                RankedChoiceProcessor.countRound(ballotBox, eliminatedCandidates, roundNumber);
            voteCounts.add(voteCount);

            Map<UUID, Integer> currentVotes = voteCount.getCurrentVotes();
            int totalVotes = currentVotes.values().stream().mapToInt(Integer::intValue).sum();

            // Check if we have a majority winner
            Optional<Map.Entry<UUID, Integer>> majorityWinner = currentVotes.entrySet()
                                                                            .stream()
                                                                            .filter(entry -> entry.getValue()
                                                                                > totalVotes / 2)
                                                                            .findFirst();

            if (majorityWinner.isPresent())
            {
                // We have a winner!
                rounds.add(new RoundResult(
                    roundNumber,
                    currentVotes,
                    null,
                    "Winner achieved majority"
                ));
                return new ElectionResult(majorityWinner.get().getKey(), rounds, totalVotes);
            }

            // Check if we're down to two candidates
            if (currentVotes.size() <= 2)
            {
                // Get the candidate with the most votes
                UUID winner = currentVotes.entrySet().stream()
                                          .max(Map.Entry.comparingByValue())
                                          .map(Map.Entry::getKey)
                                          .orElseThrow(() -> new IllegalStateException("No votes in final round"));

                rounds.add(new RoundResult(
                    roundNumber,
                    currentVotes,
                    null,
                    "Final round winner"
                ));
                return new ElectionResult(winner, rounds, totalVotes);
            }

            // Find candidate(s) with lowest votes
            int minVotes = currentVotes.values().stream()
                                       .mapToInt(Integer::intValue)
                                       .min()
                                       .orElseThrow();

            Set<UUID> candidatesWithMinVotes = currentVotes.entrySet().stream()
                                                           .filter(entry -> entry.getValue() == minVotes)
                                                           .map(Map.Entry::getKey)
                                                           .collect(Collectors.toSet());

            // Handle ties for elimination
            UUID candidateToEliminate;
            String eliminationReason;

            if (candidatesWithMinVotes.size() > 1)
            {
                candidateToEliminate = RankedChoiceProcessor.breakTie(
                    ballotBox,
                    candidatesWithMinVotes,
                    voteCounts,
                    tieBreakerStyle
                );
                eliminationReason = "Eliminated after tie resolution";
            }
            else
            {
                candidateToEliminate = candidatesWithMinVotes.iterator().next();
                eliminationReason = "Eliminated with lowest votes";
            }

            // Record this round's results
            rounds.add(new RoundResult(
                roundNumber,
                currentVotes,
                candidateToEliminate,
                eliminationReason
            ));

            // Eliminate the candidate
            eliminatedCandidates.add(candidateToEliminate);
        }
    }

    // Voting Methods

    // This handles new and updated votes
    public VoteResponse voteForCandidate(
        @NotNull UUID candidateId,
        @NotNull UUID userId,
        @NotNull Integer rank
    )
    {
        Candidate candidate = getCandidate(candidateId);
        // If the user has already voted for this candidate, update the vote. Else, new.
        Vote vote = getVote(candidateId, userId);
        if (vote == null)
        {
            // They are a fresh voter on this candidate.
            vote = new Vote(
                keycloakUserService.getUserById(userId),
                candidate,
                rank
            );
        }
        else
        {
            // Not fresh! Update the rank if it changed.
            if (Objects.equals(vote.getRank(), rank))
            {
                throw new DuplicateVoteException("A vote of this rank has already been recorded for this candidate.");
            }
            vote.setRank(rank);
        }
        return new VoteResponse(voteRepository.saveAndFlush(vote));
    }

    public void deleteVoteForCandidate(
        @NotNull UUID candidateId,
        @NotNull UUID userId
    )
    {
        Vote vote = getVote(candidateId, userId);
        if (vote == null)
        {
            throw new ResourceNotFoundException("This user has no recorded votes for this candidate.");
        }
        voteRepository.delete(vote);
    }

    // Helper Methods
    public Election getElection(UUID electionId)
    {
        return electionRepository.findById(electionId).orElseThrow(
            () -> new ResourceNotFoundException("Election does not exist.")
        );
    }

    public Candidate getCandidate(UUID candidateId)
    {
        return candidateRepository.findById(candidateId).orElseThrow(
            () -> new ResourceNotFoundException("Candidate does not exist.")
        );
    }

    public Vote getVote(UUID candidateId, UUID userId)
    {
        return voteRepository.findByIdAndVoter_Id(candidateId, userId).orElse(null);
    }

    // Validation

    private void validateElectionCreator(
        @NotNull Election election,
        @NotNull UUID userId
    )
    {
        if (!election.getCreator().getId().equals(userId))
        {
            throw new AccessDeniedException("User did not create this election.");
        }
    }
}
