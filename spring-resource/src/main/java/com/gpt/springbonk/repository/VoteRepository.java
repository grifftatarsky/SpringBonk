package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.Vote;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VoteRepository extends JpaRepository<Vote, UUID> {
  Optional<Vote> findByIdAndVoter_Id(UUID id, UUID voterId);

  List<Vote> findByVoter_IdAndCandidate_Election_IdOrderByRankAsc(UUID voterId, UUID electionId);

  Optional<Vote> findByCandidate_IdAndVoter_Id(UUID candidateId, UUID voterId);
}
