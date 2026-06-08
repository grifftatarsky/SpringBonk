package com.gpt.oozengine.controller;

import com.gpt.oozengine.model.dto.request.ItemRequest;
import com.gpt.oozengine.model.dto.response.ItemResponse;
import com.gpt.oozengine.service.AbstractCatalogService;
import com.gpt.oozengine.service.ItemService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("item")
@Tag(name = "Items")
public class ItemController extends AbstractCatalogController<ItemRequest, ItemResponse> {

  private final ItemService itemService;

  public ItemController(ItemService itemService) {
    this.itemService = itemService;
  }

  @Override
  protected AbstractCatalogService<?, ItemRequest, ItemResponse> service() {
    return itemService;
  }
}
