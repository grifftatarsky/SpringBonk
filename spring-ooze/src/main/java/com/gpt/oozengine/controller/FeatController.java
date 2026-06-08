package com.gpt.oozengine.controller;

import com.gpt.oozengine.model.dto.request.FeatRequest;
import com.gpt.oozengine.model.dto.response.FeatResponse;
import com.gpt.oozengine.service.AbstractCatalogService;
import com.gpt.oozengine.service.FeatService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("feat")
@Tag(name = "Feats")
public class FeatController extends AbstractCatalogController<FeatRequest, FeatResponse> {

  private final FeatService featService;

  public FeatController(FeatService featService) {
    this.featService = featService;
  }

  @Override
  protected AbstractCatalogService<?, FeatRequest, FeatResponse> service() {
    return featService;
  }
}
