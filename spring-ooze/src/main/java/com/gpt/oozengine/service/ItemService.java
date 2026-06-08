package com.gpt.oozengine.service;

import com.gpt.oozengine.constant.ContentType;
import com.gpt.oozengine.model.Item;
import com.gpt.oozengine.model.dto.request.ItemRequest;
import com.gpt.oozengine.model.dto.response.ItemResponse;
import com.gpt.oozengine.repository.CatalogRepository;
import com.gpt.oozengine.repository.HiddenContentRepository;
import com.gpt.oozengine.repository.ItemRepository;
import java.util.Comparator;
import org.springframework.stereotype.Service;

@Service
public class ItemService extends AbstractCatalogService<Item, ItemRequest, ItemResponse> {

  private final ItemRepository items;
  private final HiddenContentRepository hidden;

  public ItemService(ItemRepository items, HiddenContentRepository hidden) {
    this.items = items;
    this.hidden = hidden;
  }

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
  protected Comparator<Item> listOrder() {
    return Comparator.comparing(Item::getName, String.CASE_INSENSITIVE_ORDER);
  }

  @Override
  protected void apply(ItemRequest r, Item i) {
    i.setName(r.name());
    i.setCategory(r.category());
    i.setRarity(r.rarity());
    i.setCost(r.cost());
    i.setWeight(r.weight());
    i.setAttunement(r.attunement());
    i.setDescription(r.description());
    i.setProperties(r.properties());
  }

  @Override
  protected ItemResponse toResponse(Item i) {
    return ItemResponse.from(i);
  }
}
