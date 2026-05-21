package com.gpt.springbonk.service.impl;

import com.gpt.springbonk.model.Tag;
import com.gpt.springbonk.repository.TagRepository;
import com.gpt.springbonk.service.TagService;
import jakarta.transaction.Transactional;
import java.text.Normalizer;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class TagServiceImpl implements TagService {
  private final TagRepository tagRepository;

  @Override
  public List<Tag> listAll() {
    return tagRepository.findAllByOrderByLabelAsc();
  }

  @Override
  public Set<Tag> resolveOrCreate(List<String> labels) {
    if (labels == null || labels.isEmpty()) {
      return Set.of();
    }

    // Build slug→label map preserving insertion order; collapses duplicates
    // and trimmed-empty entries.
    Map<String, String> slugToLabel = new HashMap<>();
    LinkedHashSet<String> orderedSlugs = new LinkedHashSet<>();
    for (String label : labels) {
      if (label == null) continue;
      String trimmed = label.trim();
      if (trimmed.isEmpty()) continue;
      String slug = toSlug(trimmed);
      if (slug.isEmpty()) continue;
      slugToLabel.putIfAbsent(slug, trimmed);
      orderedSlugs.add(slug);
    }
    if (orderedSlugs.isEmpty()) {
      return Set.of();
    }

    List<Tag> existing = tagRepository.findBySlugIn(List.copyOf(orderedSlugs));
    Map<String, Tag> bySlug = new HashMap<>();
    for (Tag tag : existing) {
      bySlug.put(tag.getSlug(), tag);
    }

    LinkedHashSet<Tag> result = new LinkedHashSet<>();
    for (String slug : orderedSlugs) {
      Tag tag = bySlug.get(slug);
      if (tag == null) {
        tag = tagRepository.saveAndFlush(new Tag(slugToLabel.get(slug), slug));
      }
      result.add(tag);
    }
    return result;
  }

  /** Lowercased, hyphen-separated, ASCII-folded — stable URL slugs. */
  private static String toSlug(String input) {
    String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
        .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
    String slug = normalized.toLowerCase()
        .replaceAll("[^a-z0-9]+", "-")
        .replaceAll("(^-|-$)", "");
    return slug.length() > 64 ? slug.substring(0, 64) : slug;
  }
}
