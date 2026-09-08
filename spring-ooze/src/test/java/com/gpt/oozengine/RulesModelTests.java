package com.gpt.oozengine;

import static org.assertj.core.api.Assertions.assertThat;

import com.gpt.oozengine.constant.rules.Ability;
import com.gpt.oozengine.constant.rules.Activation;
import com.gpt.oozengine.constant.rules.AttackKind;
import com.gpt.oozengine.constant.rules.ConditionCode;
import com.gpt.oozengine.constant.rules.CreatureSize;
import com.gpt.oozengine.constant.rules.CreatureType;
import com.gpt.oozengine.constant.rules.DamageResponseKind;
import com.gpt.oozengine.constant.rules.DamageType;
import com.gpt.oozengine.constant.rules.Delivery;
import com.gpt.oozengine.constant.rules.EffectKind;
import com.gpt.oozengine.constant.rules.EffectOutcome;
import com.gpt.oozengine.constant.rules.MovementType;
import com.gpt.oozengine.constant.rules.SenseType;
import com.gpt.oozengine.constant.rules.Skill;
import com.gpt.oozengine.model.Condition;
import com.gpt.oozengine.model.Monster;
import com.gpt.oozengine.model.creature.DamageResponse;
import com.gpt.oozengine.model.creature.SenseRange;
import com.gpt.oozengine.model.creature.SkillBonus;
import com.gpt.oozengine.model.creature.StatBlock;
import com.gpt.oozengine.model.mechanics.DiceRoll;
import com.gpt.oozengine.model.mechanics.Effect;
import com.gpt.oozengine.model.mechanics.Feature;
import com.gpt.oozengine.model.mechanics.FeatureComponent;
import com.gpt.oozengine.repository.ConditionRepository;
import com.gpt.oozengine.repository.FeatureRepository;
import com.gpt.oozengine.repository.MonsterRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

/**
 * The rules model, exercised by building a real stat block rather than by
 * asserting that columns exist.
 *
 * <p>The subject is the Aboleth's Tentacle, because it is the case that decides
 * whether the model is expressive enough: one attack, two consequences on the
 * same hit — damage, and a condition with an escape DC — plus a Multiattack that
 * refers to it rather than restating it.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class RulesModelTests {

  @Autowired private MonsterRepository monsters;
  @Autowired private ConditionRepository conditions;
  @Autowired private FeatureRepository features;

  @Test
  @Transactional
  @DisplayName("a stat block round-trips with its features, effects and collections")
  void statBlockRoundTrips() {
    Condition grappled =
        conditions.findByOwnerIdIsNull().stream()
            .filter(c -> c.getCode() == ConditionCode.GRAPPLED)
            .findFirst()
            .orElseThrow();

    StatBlock block = new StatBlock();
    block.setSize(CreatureSize.LARGE);
    block.setCreatureType(CreatureType.ABERRATION);
    block.setArmorClass(17);
    block.setInitiativeBonus(7);
    block.setHitPoints(new DiceRoll(20, 10, 40, 150));
    block.getSpeeds().put(MovementType.WALK, 10);
    block.getSpeeds().put(MovementType.SWIM, 40);
    block.setStrength(21);
    block.setDexterity(9);
    block.setConstitution(15);
    block.getSaveBonuses().put(Ability.CONSTITUTION, 6);
    block.getSkills().add(new SkillBonus(Skill.HISTORY, 12));
    block.getSenses().add(new SenseRange(SenseType.DARKVISION, 120));
    block.getDamageResponses()
        .add(new DamageResponse(DamageType.PSYCHIC, DamageResponseKind.IMMUNITY, null));
    block.getConditionImmunities().add(grappled);
    block.setChallengeRating(new BigDecimal("10"));
    block.setProficiencyBonus(4);

    Feature tentacle = new Feature();
    tentacle.setName("Tentacle");
    tentacle.setActivation(Activation.ACTION);
    tentacle.setDelivery(Delivery.ATTACK_ROLL);
    tentacle.setAttackKind(AttackKind.MELEE);
    tentacle.setAttackBonus(9);
    tentacle.setReachFeet(15);

    Effect damage = new Effect();
    damage.setOutcome(EffectOutcome.HIT);
    damage.setKind(EffectKind.DAMAGE);
    damage.setAmount(new DiceRoll(2, 6, 5, 12));
    damage.setDamageType(DamageType.BLUDGEONING);
    tentacle.addEffect(damage);

    // The rider that makes the Tentacle more than a damage roll, and the reason
    // effects are a list rather than one column per outcome.
    Effect grapple = new Effect();
    grapple.setOutcome(EffectOutcome.HIT);
    grapple.setKind(EffectKind.APPLY_CONDITION);
    grapple.setCondition(grappled);
    grapple.setEscapeDc(14);
    grapple.setNotes("Large or smaller creatures only; one of four tentacles.");
    tentacle.addEffect(grapple);
    block.addFeature(tentacle);

    Feature multiattack = new Feature();
    multiattack.setName("Multiattack");
    multiattack.setActivation(Activation.ACTION);
    FeatureComponent twoTentacles = new FeatureComponent();
    twoTentacles.setReferencedFeature(tentacle);
    twoTentacles.setCount(2);
    multiattack.addComponent(twoTentacles);
    block.addFeature(multiattack);

    Monster aboleth = new Monster();
    aboleth.setName("Test Aboleth");
    aboleth.setStatBlock(block);
    Monster saved = monsters.saveAndFlush(aboleth);

    Monster read = monsters.findById(saved.getId()).orElseThrow();
    StatBlock rb = read.getStatBlock();
    assertThat(rb.getHitPoints().expression()).isEqualTo("20d10 + 40");
    assertThat(rb.getHitPoints().getAverage()).isEqualTo(150);
    assertThat(rb.getSpeeds()).containsEntry(MovementType.SWIM, 40);
    assertThat(rb.modifier(Ability.STRENGTH)).isEqualTo(5);
    assertThat(rb.saveBonus(Ability.CONSTITUTION)).isEqualTo(6);
    assertThat(rb.saveBonus(Ability.DEXTERITY)).isEqualTo(-1); // falls back to the modifier
    assertThat(rb.getConditionImmunities()).extracting(Condition::getName).containsExactly("Grappled");

    Feature readTentacle = rb.getFeatures().getFirst();
    assertThat(readTentacle.getName()).isEqualTo("Tentacle");
    assertThat(readTentacle.getEffects()).hasSize(2);
    assertThat(readTentacle.getEffects().getFirst().getAmount().expression()).isEqualTo("2d6 + 5");
    assertThat(readTentacle.getEffects().get(1).getCondition().getCode())
        .isEqualTo(ConditionCode.GRAPPLED);
    assertThat(readTentacle.getEffects().get(1).getEscapeDc()).isEqualTo(14);

    Feature readMultiattack = rb.getFeatures().get(1);
    assertThat(readMultiattack.getComponents()).hasSize(1);
    assertThat(readMultiattack.getComponents().getFirst().getReferencedFeature().getName())
        .isEqualTo("Tentacle");
    assertThat(readMultiattack.getComponents().getFirst().getCount()).isEqualTo(2);

    // The owner columns are mirrored read-only, which is what lets the simulator
    // fetch a creature's actions without loading the monster aggregate.
    List<Feature> byOwner = features.findByStatBlockIdOrderByOrdinalAsc(rb.getId());
    assertThat(byOwner).extracting(Feature::getName).containsExactly("Tentacle", "Multiattack");

    monsters.delete(read);
  }

  @Test
  @Transactional
  @DisplayName("the migration gave every seeded monster a stat block")
  void seededMonstersHaveStatBlocks() {
    var base = monsters.findByOwnerIdIsNull();
    assertThat(base).isNotEmpty();
    assertThat(base).allSatisfy(m -> assertThat(m.getStatBlock()).isNotNull());

    Monster dragon =
        base.stream().filter(m -> m.getName().equals("Adult Red Dragon")).findFirst().orElseThrow();
    StatBlock s = dragon.getStatBlock();
    assertThat(s.getSize()).isEqualTo(CreatureSize.HUGE);
    assertThat(s.getCreatureType()).isEqualTo(CreatureType.DRAGON);
    assertThat(s.getChallengeRating()).isEqualByComparingTo("17");
    assertThat(s.getHitPoints().getAverage()).isEqualTo(256);
    assertThat(s.getHitPoints().expression()).isEqualTo("19d12 + 133");
    assertThat(s.getSpeeds())
        .containsEntry(MovementType.WALK, 40)
        .containsEntry(MovementType.CLIMB, 40)
        .containsEntry(MovementType.FLY, 80);
  }

  @Test
  @Transactional
  @DisplayName("a subtype survives the split from the creature type")
  void goblinKeepsItsSubtype() {
    Monster goblin =
        monsters.findByOwnerIdIsNull().stream()
            .filter(m -> m.getName().equals("Goblin"))
            .findFirst()
            .orElseThrow();
    assertThat(goblin.getStatBlock().getCreatureType()).isEqualTo(CreatureType.HUMANOID);
    assertThat(goblin.getStatBlock().getCreatureSubtype()).isEqualTo("Goblinoid");
    assertThat(goblin.getStatBlock().getChallengeRating()).isEqualByComparingTo("0.25");
  }
}
