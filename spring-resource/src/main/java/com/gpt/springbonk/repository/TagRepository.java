package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.Tag;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {
  Optional<Tag> findBySlug(String slug);

  List<Tag> findBySlugIn(List<String> slugs);

  List<Tag> findAllByOrderByLabelAsc();
}
