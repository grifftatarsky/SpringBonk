package com.gpt.springbonk.service;

import com.gpt.springbonk.model.Tag;
import java.util.List;
import java.util.Set;

public interface TagService {
  List<Tag> listAll();

  /**
   * Resolve {@code labels} to {@link Tag} entities, creating any that don't
   * already exist (deduplicated by slug). Returns the persisted set in
   * insertion order; an empty/null input yields an empty set.
   */
  Set<Tag> resolveOrCreate(List<String> labels);
}
