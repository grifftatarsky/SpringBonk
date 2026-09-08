package com.gpt.oozengine.service;

import com.gpt.oozengine.model.Condition;
import com.gpt.oozengine.model.creature.DamageResponse;
import com.gpt.oozengine.model.creature.SenseRange;
import com.gpt.oozengine.model.creature.SkillBonus;
import com.gpt.oozengine.model.creature.StatBlock;
import com.gpt.oozengine.model.dto.request.EffectRequest;
import com.gpt.oozengine.model.dto.request.FeatureComponentRequest;
import com.gpt.oozengine.model.dto.request.FeatureRequest;
import com.gpt.oozengine.model.dto.request.StatBlockRequest;
import com.gpt.oozengine.model.mechanics.DiceRoll;
import com.gpt.oozengine.model.mechanics.Effect;
import com.gpt.oozengine.model.mechanics.Feature;
import com.gpt.oozengine.model.mechanics.FeatureComponent;
import com.gpt.oozengine.repository.ConditionRepository;
import com.gpt.oozengine.repository.FeatureRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.stereotype.Component;

/**
 * Writes a {@link StatBlockRequest} onto a {@link StatBlock}.
 *
 * <p>Shared by monsters and characters, because a stat block is a stat block.
 *
 * <p>Two different update strategies, and the difference matters. Value
 * collections — speeds, saves, skills, senses, damage responses — are replaced
 * wholesale: they have no identity, so there is nothing to preserve and
 * rebuilding them is both simpler and correct. Features are matched on id and
 * updated in place, because their identity is referenced: a Multiattack points
 * at one, and anything the simulator logs points at one. Rebuilding those on
 * every save would break the references and churn the ids for no reason.
 */
@Component
public class StatBlockMapper {

  private final ConditionRepository conditions;
  private final FeatureRepository features;

  public StatBlockMapper(ConditionRepository conditions, FeatureRepository features) {
    this.conditions = conditions;
    this.features = features;
  }

  public void apply(StatBlockRequest r, StatBlock s) {
    if (r == null) {
      return;
    }
    applyHeader(r, s);
    applyDefences(r, s);
    applyAbilities(r, s);
    applySenses(r, s);
    applyChallenge(r, s);
    syncFeatures(r.features(), s);
  }

  private void applyHeader(StatBlockRequest r, StatBlock s) {
    s.setSize(r.size());
    s.setCreatureType(r.creatureType());
    s.setCreatureSubtype(blankToNull(r.creatureSubtype()));
    s.setAlignment(r.alignment());
    s.setLanguages(blankToNull(r.languages()));
    s.setTelepathyFeet(r.telepathyFeet());
  }

  private void applyDefences(StatBlockRequest r, StatBlock s) {
    s.setArmorClass(r.armorClass());
    s.setArmorClassNote(blankToNull(r.armorClassNote()));
    s.setInitiativeBonus(r.initiativeBonus());
    s.setHitPoints(
        new DiceRoll(
            r.hitPointsDiceCount(),
            r.hitPointsDiceFaces(),
            r.hitPointsDiceBonus(),
            r.hitPointsAverage()));
    s.setCanHover(r.canHover());
    s.getSpeeds().clear();
    if (r.speeds() != null) {
      // A zero speed is how a client says "not this mode"; storing it would
      // claim the creature can fly at 0 feet rather than not fly at all.
      r.speeds().forEach((mode, feet) -> {
        if (feet != null && feet > 0) {
          s.getSpeeds().put(mode, feet);
        }
      });
    }
  }

  private void applyAbilities(StatBlockRequest r, StatBlock s) {
    s.setStrength(r.strength());
    s.setDexterity(r.dexterity());
    s.setConstitution(r.constitution());
    s.setIntelligence(r.intelligence());
    s.setWisdom(r.wisdom());
    s.setCharisma(r.charisma());
    s.getSaveBonuses().clear();
    if (r.saveBonuses() != null) {
      r.saveBonuses().forEach((ability, bonus) -> {
        if (bonus != null) {
          s.getSaveBonuses().put(ability, bonus);
        }
      });
    }
    s.getSkills().clear();
    if (r.skills() != null) {
      r.skills().forEach((skill, bonus) -> {
        if (bonus != null) {
          s.getSkills().add(new SkillBonus(skill, bonus));
        }
      });
    }
  }

  private void applySenses(StatBlockRequest r, StatBlock s) {
    s.setPassivePerception(r.passivePerception());
    s.getSenses().clear();
    if (r.senses() != null) {
      r.senses().forEach((sense, range) -> {
        if (range != null && range > 0) {
          s.getSenses().add(new SenseRange(sense, range));
        }
      });
    }
    s.getDamageResponses().clear();
    if (r.damageResponses() != null) {
      for (var d : r.damageResponses()) {
        if (d.damageType() != null && d.response() != null) {
          s.getDamageResponses()
              .add(new DamageResponse(d.damageType(), d.response(), blankToNull(d.qualifier())));
        }
      }
    }
    s.getConditionImmunities().clear();
    if (r.conditionImmunityIds() != null && !r.conditionImmunityIds().isEmpty()) {
      s.getConditionImmunities().addAll(conditions.findAllById(r.conditionImmunityIds()));
    }
  }

  private void applyChallenge(StatBlockRequest r, StatBlock s) {
    s.setChallengeRating(r.challengeRating());
    s.setExperiencePoints(r.experiencePoints());
    s.setProficiencyBonus(r.proficiencyBonus());
    s.setSpellcastingAbility(r.spellcastingAbility());
    s.setSpellSaveDc(r.spellSaveDc());
    s.setSpellAttackBonus(r.spellAttackBonus());
    s.setLegendaryActionUses(r.legendaryActionUses());
  }

  /** Matches on id, keeps what is still there, drops what isn't, in request order. */
  private void syncFeatures(List<FeatureRequest> requested, StatBlock s) {
    if (requested == null) {
      return; // absent means "leave the features alone", not "delete them all"
    }
    Map<UUID, Feature> existing = new HashMap<>();
    s.getFeatures().forEach(f -> existing.put(f.getId(), f));

    List<Feature> next = new java.util.ArrayList<>();
    int ordinal = 0;
    for (FeatureRequest fr : requested) {
      Feature f = fr.id() == null ? new Feature() : existing.get(fr.id());
      if (f == null) {
        f = new Feature(); // an id the client made up, or one already deleted
      }
      applyFeature(fr, f);
      f.setOrdinal(ordinal++);
      next.add(f);
    }
    // Mutate in place: replacing the list instance defeats orphanRemoval, so
    // dropped features would be orphaned rather than deleted.
    s.getFeatures().clear();
    s.getFeatures().addAll(next);
  }

  private void applyFeature(FeatureRequest r, Feature f) {
    f.setName(r.name());
    f.setDescription(blankToNull(r.description()));
    f.setActivation(orDefault(r.activation(), com.gpt.oozengine.constant.rules.Activation.ACTION));
    f.setLegendaryCost(r.legendaryCost());
    f.setActivationTime(r.activationTime());
    f.setActivationUnit(r.activationUnit());
    f.setTriggerText(blankToNull(r.triggerText()));
    f.setRitual(r.ritual());
    f.setUsesReset(orDefault(r.usesReset(), com.gpt.oozengine.constant.rules.UsesReset.AT_WILL));
    f.setUsesMax(r.usesMax());
    f.setRechargeMin(r.rechargeMin());
    f.setRechargeMax(r.rechargeMax());
    f.setRangeType(r.rangeType());
    f.setRangeFeet(r.rangeFeet());
    f.setRangeLongFeet(r.rangeLongFeet());
    f.setReachFeet(r.reachFeet());
    f.setTargetKind(r.targetKind());
    f.setTargetCount(r.targetCount());
    f.setTargetFilter(blankToNull(r.targetFilter()));
    f.setAreaShape(r.areaShape());
    f.setAreaSizeFeet(r.areaSizeFeet());
    f.setAreaHeightFeet(r.areaHeightFeet());
    f.setDelivery(orDefault(r.delivery(), com.gpt.oozengine.constant.rules.Delivery.AUTOMATIC));
    f.setAttackKind(r.attackKind());
    f.setAttackBonus(r.attackBonus());
    f.setAttackBonusSource(r.attackBonusSource());
    f.setSaveAbility(r.saveAbility());
    f.setSaveDc(r.saveDc());
    f.setSaveDcSource(r.saveDcSource());
    syncEffects(r.effects(), f);
    syncComponents(r.components(), f);
  }

  private void syncEffects(List<EffectRequest> requested, Feature f) {
    if (requested == null) {
      return;
    }
    Map<UUID, Effect> existing = new HashMap<>();
    f.getEffects().forEach(e -> existing.put(e.getId(), e));

    List<Effect> next = new java.util.ArrayList<>();
    int ordinal = 0;
    for (EffectRequest er : requested) {
      Effect e = er.id() == null ? new Effect() : existing.getOrDefault(er.id(), new Effect());
      e.setOutcome(er.outcome());
      e.setKind(er.kind());
      e.setAmount(
          new DiceRoll(er.diceCount(), er.diceFaces(), er.diceBonus(), er.diceAverage()));
      e.setDamageType(er.damageType());
      e.setHalfDamage(er.halfDamage());
      e.setCondition(lookup(er.conditionId(), conditions::findById));
      e.setEscapeDc(er.escapeDc());
      e.setRepeatSaveAbility(er.repeatSaveAbility());
      e.setDurationAmount(er.durationAmount());
      e.setDurationUnit(er.durationUnit());
      e.setMovementType(er.movementType());
      e.setMovementFeet(er.movementFeet());
      e.setNotes(blankToNull(er.notes()));
      e.setOrdinal(ordinal++);
      next.add(e);
    }
    f.getEffects().clear();
    f.getEffects().addAll(next);
  }

  private void syncComponents(List<FeatureComponentRequest> requested, Feature f) {
    if (requested == null) {
      return;
    }
    List<FeatureComponent> next = new java.util.ArrayList<>();
    int ordinal = 0;
    for (FeatureComponentRequest cr : requested) {
      Feature target = lookup(cr.referencedFeatureId(), features::findById);
      if (target == null) {
        continue; // a component pointing at nothing is not worth persisting
      }
      FeatureComponent c = new FeatureComponent();
      c.setReferencedFeature(target);
      c.setCount(Math.max(1, cr.count()));
      c.setOptional(cr.optional());
      c.setOrdinal(ordinal++);
      next.add(c);
    }
    f.getComponents().clear();
    f.getComponents().addAll(next);
  }

  private static <T> T lookup(UUID id, Function<UUID, Optional<T>> finder) {
    return id == null ? null : finder.apply(id).orElse(null);
  }

  private static <T> T orDefault(T value, T fallback) {
    return value == null ? fallback : value;
  }

  private static String blankToNull(String s) {
    return s == null || s.isBlank() ? null : s;
  }

  /** Condition rows for the editor's immunity picker. */
  public List<Condition> baseConditions() {
    return conditions.findByOwnerIdIsNull();
  }
}
