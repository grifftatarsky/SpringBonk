package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.Shelf;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShelfRepository extends JpaRepository<Shelf, UUID> {
  List<Shelf> findByUserId(UUID userId);

  Page<Shelf> findByUserId(UUID userId, Pageable pageable);

  Optional<Shelf> findByUserIdAndDefaultShelfAndTitle(UUID userId, boolean isDefault, String title);
}
