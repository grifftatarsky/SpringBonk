package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.UserBookStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserBookStatusRepository extends JpaRepository<UserBookStatus, UUID> {
  Optional<UserBookStatus> findByUser_IdAndBook_Id(UUID userId, UUID bookId);

  /** Recent finishes for the activity feed. */
  List<UserBookStatus> findByFinishedAtIsNotNullAndFinishedAtBeforeOrderByFinishedAtDesc(
      LocalDateTime before,
      Pageable pageable
  );

  /** Recent "started reading" events. */
  List<UserBookStatus> findByStartedAtIsNotNullAndStartedAtBeforeOrderByStartedAtDesc(
      LocalDateTime before,
      Pageable pageable
  );
}
