package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.Review;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {
  Page<Review> findByBook_IdOrderByCreatedDateDesc(UUID bookId, Pageable pageable);

  Page<Review> findByAuthor_IdOrderByCreatedDateDesc(UUID authorId, Pageable pageable);

  Optional<Review> findByAuthor_IdAndBook_Id(UUID authorId, UUID bookId);

  /** Recent reviews across all users for the activity feed. */
  List<Review> findByCreatedDateBeforeOrderByCreatedDateDesc(
      LocalDateTime before,
      Pageable pageable
  );
}
