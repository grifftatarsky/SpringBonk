package com.gpt.oozengine.controller;

import com.gpt.oozengine.model.dto.request.SpellRequest;
import com.gpt.oozengine.model.dto.response.SpellResponse;
import com.gpt.oozengine.service.AbstractCatalogService;
import com.gpt.oozengine.service.SpellService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("spell")
@Tag(name = "Spells")
public class SpellController extends AbstractCatalogController<SpellRequest, SpellResponse> {

  private final SpellService spellService;

  public SpellController(SpellService spellService) {
    this.spellService = spellService;
  }

  @Override
  protected AbstractCatalogService<?, SpellRequest, SpellResponse> service() {
    return spellService;
  }
}
