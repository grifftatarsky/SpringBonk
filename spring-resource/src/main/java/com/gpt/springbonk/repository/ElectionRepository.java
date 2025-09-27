package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.Election;
import java.time.ZonedDateTime;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ElectionRepository extends JpaRepository<Election, UUID> {

  @Query("""
        select e from Election e
        where e.endDateTime > :now
          and not exists (select 1 from ElectionResult r where r.election.id = e.id)
      """)
  Set<Election> findAllOpenEndingAfter(ZonedDateTime now);
}
