package com.gpt.oozengine.service;

import com.gpt.oozengine.constant.ContentType;
import com.gpt.oozengine.model.GlossaryEntry;
import com.gpt.oozengine.model.dto.request.GlossaryEntryRequest;
import com.gpt.oozengine.model.dto.response.GlossaryEntryResponse;
import com.gpt.oozengine.repository.CatalogRepository;
import com.gpt.oozengine.repository.GlossaryEntryRepository;
import com.gpt.oozengine.repository.HiddenContentRepository;
import java.util.Comparator;
import org.springframework.stereotype.Service;

@Service
public class GlossaryEntryService
    extends AbstractCatalogService<GlossaryEntry, GlossaryEntryRequest, GlossaryEntryResponse> {

  private final GlossaryEntryRepository entries;
  private final HiddenContentRepository hidden;

  public GlossaryEntryService(GlossaryEntryRepository entries, HiddenContentRepository hidden) {
    this.entries = entries;
    this.hidden = hidden;
  }

  @Override
  protected CatalogRepository<GlossaryEntry> repo() {
    return entries;
  }

  @Override
  protected HiddenContentRepository hiddenRepo() {
    return hidden;
  }

  @Override
  protected ContentType contentType() {
    return ContentType.GLOSSARY;
  }

  @Override
  protected GlossaryEntry instantiate() {
    return new GlossaryEntry();
  }

  @Override
  protected Comparator<GlossaryEntry> listOrder() {
    return Comparator.comparing(GlossaryEntry::getName, String.CASE_INSENSITIVE_ORDER);
  }

  @Override
  protected void apply(GlossaryEntryRequest r, GlossaryEntry g) {
    g.setName(r.name());
    g.setDescription(r.description());
  }

  @Override
  protected GlossaryEntryResponse toResponse(GlossaryEntry g) {
    return GlossaryEntryResponse.from(g);
  }
}
