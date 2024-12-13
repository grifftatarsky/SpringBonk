package com.gpt.springbonk.repository;


import com.gpt.springbonk.model.Candidate;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CandidateRepository extends JpaRepository<Candidate, UUID>
{ }
