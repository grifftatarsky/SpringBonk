package com.gpt.oozengine.controller;

import com.gpt.oozengine.model.dto.request.GlossaryEntryRequest;
import com.gpt.oozengine.model.dto.response.GlossaryEntryResponse;
import com.gpt.oozengine.service.AbstractCatalogService;
import com.gpt.oozengine.service.GlossaryEntryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("glossary")
@Tag(name = "Rules Glossary")
public class GlossaryEntryController
    extends AbstractCatalogController<GlossaryEntryRequest, GlossaryEntryResponse> {

  private final GlossaryEntryService glossaryEntryService;

  public GlossaryEntryController(GlossaryEntryService glossaryEntryService) {
    this.glossaryEntryService = glossaryEntryService;
  }

  @Override
  protected AbstractCatalogService<?, GlossaryEntryRequest, GlossaryEntryResponse> service() {
    return glossaryEntryService;
  }
}
