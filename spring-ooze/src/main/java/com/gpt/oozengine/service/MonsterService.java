package com.gpt.oozengine.service;

import com.gpt.oozengine.constant.ContentType;
import com.gpt.oozengine.model.Monster;
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
  private final HiddenContentRepository hidden;

  public MonsterService(MonsterRepository monsters, HiddenContentRepository hidden) {
    this.monsters = monsters;
    this.hidden = hidden;
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
    m.setSize(r.size());
    m.setCreatureType(r.creatureType());
    m.setAlignment(r.alignment());
    m.setArmorClass(r.armorClass());
    m.setHitPoints(r.hitPoints());
    m.setSpeed(r.speed());
    m.setChallengeRating(r.challengeRating());
    m.setStrength(r.strength());
    m.setDexterity(r.dexterity());
    m.setConstitution(r.constitution());
    m.setIntelligence(r.intelligence());
    m.setWisdom(r.wisdom());
    m.setCharisma(r.charisma());
    m.setTraits(r.traits());
    m.setActions(r.actions());
    m.setDescription(r.description());
  }

  @Override
  protected MonsterResponse toResponse(Monster m) {
    return MonsterResponse.from(m);
  }
}
