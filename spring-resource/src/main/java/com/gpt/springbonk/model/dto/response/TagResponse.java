package com.gpt.springbonk.model.dto.response;

import com.gpt.springbonk.model.Tag;
import java.util.UUID;
import lombok.Data;

@Data
public class TagResponse {
  private UUID id;
  private String label;
  private String slug;

  public TagResponse(Tag tag) {
    this.id = tag.getId();
    this.label = tag.getLabel();
    this.slug = tag.getSlug();
  }
}
