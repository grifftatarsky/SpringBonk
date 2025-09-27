package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.ElectionResult;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ElectionResultRepository extends JpaRepository<ElectionResult, UUID> {
}
