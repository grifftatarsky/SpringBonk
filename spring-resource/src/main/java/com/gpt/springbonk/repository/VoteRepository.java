package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.Vote;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VoteRepository extends JpaRepository<Vote, UUID> {
  Optional<Vote> findByIdAndVoter_Id(UUID id, UUID voterId);
}
