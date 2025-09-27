package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.ElectionResult;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ElectionResultRepository extends JpaRepository<ElectionResult, UUID> {

  List<ElectionResult> findAllByElection_IdOrderByClosureTimeDesc(UUID electionId);

  Optional<ElectionResult> findFirstByElection_IdOrderByClosureTimeDesc(UUID electionId);
}
