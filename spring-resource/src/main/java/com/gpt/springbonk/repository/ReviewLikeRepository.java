package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.ReviewLike;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewLikeRepository extends JpaRepository<ReviewLike, UUID> {
  Optional<ReviewLike> findByReview_IdAndUser_Id(UUID reviewId, UUID userId);

  long countByReview_Id(UUID reviewId);

  boolean existsByReview_IdAndUser_Id(UUID reviewId, UUID userId);

  /** Used to batch-check "did I like these reviews" for a listing. */
  @Query("SELECT rl.review.id FROM ReviewLike rl "
      + "WHERE rl.user.id = :userId AND rl.review.id IN :reviewIds")
  Set<UUID> findLikedReviewIdsByUser(
      @Param("userId") UUID userId,
      @Param("reviewIds") Set<UUID> reviewIds
  );
}
