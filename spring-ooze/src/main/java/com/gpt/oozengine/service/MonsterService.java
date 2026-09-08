package com.gpt.oozengine.service;

import com.gpt.oozengine.constant.ContentType;
import com.gpt.oozengine.model.Monster;
import com.gpt.oozengine.model.creature.StatBlock;
import com.gpt.oozengine.model.dto.request.MonsterRequest;
import com.gpt.oozengine.model.dto.response.MonsterResponse;
import com.gpt.oozengine.repository.CatalogRepository;
import com.gpt.oozengine.repository.HiddenContentRepository;
import com.gpt.oozengine.repository.MonsterRepository;
import java.util.Comparator;
import org.springframework.stereotype.Service;

@Service
public class MonsterService extends AbstractCatalogService<Monster, MonsterRequest, MonsterResponse> {

  private final MonsterRepository monsters;
  private final StatBlockMapper statBlocks;
  private final HiddenContentRepository hidden;

  public MonsterService(
      MonsterRepository monsters, HiddenContentRepository hidden, StatBlockMapper statBlocks) {
    this.monsters = monsters;
    this.hidden = hidden;
    this.statBlocks = statBlocks;
  }

  @Override
  protected CatalogRepository<Monster> repo() {
    return monsters;
  }

  @Override
  protected HiddenContentRepository hiddenRepo() {
    return hidden;
  }

  @Override
  protected ContentType contentType() {
    return ContentType.MONSTER;
  }

  @Override
  protected Monster instantiate() {
    return new Monster();
  }

  @Override
  protected Comparator<Monster> listOrder() {
    return Comparator.comparing(Monster::getName, String.CASE_INSENSITIVE_ORDER);
  }

  @Override
  protected void apply(MonsterRequest r, Monster m) {
    m.setName(r.name());
    m.setDescription(r.description());
    if (r.statBlock() == null) {
      return; // a rename or flavour edit: leave the mechanics alone
    }
    StatBlock s = m.getStatBlock();
    if (s == null) {
      s = new StatBlock();
      m.setStatBlock(s);
    }
    statBlocks.apply(r.statBlock(), s);
  }

  @Override
  protected MonsterResponse toResponse(Monster m) {
    return MonsterResponse.from(m);
  }
}
