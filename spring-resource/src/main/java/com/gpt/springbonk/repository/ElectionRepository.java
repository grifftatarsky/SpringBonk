package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.Election;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ElectionRepository extends JpaRepository<Election, UUID> {
}
