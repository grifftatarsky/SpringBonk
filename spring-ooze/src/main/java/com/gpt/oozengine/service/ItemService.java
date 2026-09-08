package com.gpt.oozengine.service;

import com.gpt.oozengine.constant.ContentType;
import com.gpt.oozengine.model.Item;
import com.gpt.oozengine.model.dto.request.ItemRequest;
import com.gpt.oozengine.model.dto.response.ItemResponse;
import com.gpt.oozengine.repository.CatalogRepository;
import com.gpt.oozengine.repository.HiddenContentRepository;
import com.gpt.oozengine.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ItemService extends AbstractCatalogService<Item, ItemRequest, ItemResponse> {

  private final ItemRepository items;
  private final HiddenContentRepository hidden;

  @Override
  protected CatalogRepository<Item> repo() {
    return items;
  }

  @Override
  protected HiddenContentRepository hiddenRepo() {
    return hidden;
  }

  @Override
  protected ContentType contentType() {
    return ContentType.ITEM;
  }

  @Override
  protected Item instantiate() {
    return new Item();
  }

  @Override
  protected void apply(ItemRequest r, Item i) {
    i.setName(r.name());
    i.setItemCategory(r.itemCategory());
    i.setRarityTier(r.rarityTier());
    i.setCostGp(r.costGp());
    i.setWeightLb(r.weightLb());
    i.setAttunement(r.attunement());
    i.setAttunementNote(r.attunementNote());
    i.setDescription(r.description());
  }

  @Override
  protected ItemResponse toResponse(Item i) {
    return ItemResponse.from(i);
  }
}
