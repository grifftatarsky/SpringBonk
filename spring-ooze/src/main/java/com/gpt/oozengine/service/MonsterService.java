package com.gpt.oozengine.service;

import com.gpt.oozengine.constant.ContentType;
import com.gpt.oozengine.constant.rules.MovementType;
import com.gpt.oozengine.model.Monster;
import com.gpt.oozengine.model.creature.StatBlock;
import com.gpt.oozengine.model.mechanics.DiceRoll;
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
    m.setDescription(r.description());

    // The request is the stat block's header, not the whole block. Everything
    // it doesn't mention — features, senses, resistances, gear — is left as it
    // was, so saving through the finder's generic form can't quietly wipe the
    // structured half of a creature.
    StatBlock s = m.getStatBlock();
    if (s == null) {
      s = new StatBlock();
      m.setStatBlock(s);
    }
    s.setSize(r.size());
    s.setCreatureType(r.creatureType());
    s.setCreatureSubtype(r.creatureSubtype());
    s.setAlignment(r.alignment());
    s.setArmorClass(r.armorClass());
    s.setInitiativeBonus(r.initiativeBonus());
    s.setHitPoints(
        new DiceRoll(
            r.hitPointsDiceCount(),
            r.hitPointsDiceFaces(),
            r.hitPointsDiceBonus(),
            r.hitPointsAverage()));
    setSpeed(s, MovementType.WALK, r.walkSpeed());
    setSpeed(s, MovementType.FLY, r.flySpeed());
    setSpeed(s, MovementType.SWIM, r.swimSpeed());
    setSpeed(s, MovementType.CLIMB, r.climbSpeed());
    setSpeed(s, MovementType.BURROW, r.burrowSpeed());
    s.setStrength(r.strength());
    s.setDexterity(r.dexterity());
    s.setConstitution(r.constitution());
    s.setIntelligence(r.intelligence());
    s.setWisdom(r.wisdom());
    s.setCharisma(r.charisma());
    s.setPassivePerception(r.passivePerception());
    s.setLanguages(r.languages());
    s.setChallengeRating(r.challengeRating());
    s.setExperiencePoints(r.experiencePoints());
    s.setProficiencyBonus(r.proficiencyBonus());
  }

  /** A null or non-positive speed means the creature lacks that movement mode. */
  private static void setSpeed(StatBlock s, MovementType type, Integer feet) {
    if (feet == null || feet <= 0) {
      s.getSpeeds().remove(type);
    } else {
      s.getSpeeds().put(type, feet);
    }
  }

  @Override
  protected MonsterResponse toResponse(Monster m) {
    return MonsterResponse.from(m);
  }
}
