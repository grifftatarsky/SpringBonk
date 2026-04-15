package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.ReviewComment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewCommentRepository extends JpaRepository<ReviewComment, UUID> {
  List<ReviewComment> findByReview_IdOrderByCreatedDateAsc(UUID reviewId);
}
