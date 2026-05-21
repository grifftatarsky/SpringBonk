package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.Post;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {
  Page<Post> findAllByOrderByCreatedDateDesc(Pageable pageable);

  Page<Post> findByTags_SlugOrderByCreatedDateDesc(String slug, Pageable pageable);
}
