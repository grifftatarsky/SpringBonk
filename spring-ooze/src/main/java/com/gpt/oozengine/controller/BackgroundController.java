package com.gpt.oozengine.controller;

import com.gpt.oozengine.model.dto.request.BackgroundRequest;
import com.gpt.oozengine.model.dto.response.BackgroundResponse;
import com.gpt.oozengine.service.AbstractCatalogService;
import com.gpt.oozengine.service.BackgroundService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("background")
@Tag(name = "Backgrounds")
public class BackgroundController
    extends AbstractCatalogController<BackgroundRequest, BackgroundResponse> {

  private final BackgroundService backgroundService;

  public BackgroundController(BackgroundService backgroundService) {
    this.backgroundService = backgroundService;
  }

  @Override
  protected AbstractCatalogService<?, BackgroundRequest, BackgroundResponse> service() {
    return backgroundService;
  }
}
