package com.gpt.springbonk.service.electoral;

import com.gpt.springbonk.exception.DuplicateVoteException;
import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.keycloak.KeycloakUserService;
import com.gpt.springbonk.model.Candidate;
import com.gpt.springbonk.model.Vote;
import com.gpt.springbonk.model.dto.response.VoteResponse;
import com.gpt.springbonk.repository.VoteRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class VotingService {
  // region DI

  private final VoteRepository voteRepository;
  private final CandidateService candidateService;
  private final KeycloakUserService keycloakUserService;

  // endregion

  public VoteResponse voteForCandidate(
      @NotNull UUID candidateId,
      @NotNull UUID userId,
      @NotNull Integer rank
  ) {
    Candidate candidate = candidateService.getCandidate(candidateId);
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

  public Vote getVote(UUID candidateId, UUID userId) {
    return voteRepository.findByCandidate_IdAndVoter_Id(candidateId, userId).orElse(null);
  }
}
