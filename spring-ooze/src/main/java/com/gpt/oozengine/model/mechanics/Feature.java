package com.gpt.oozengine.model.mechanics;

import com.gpt.oozengine.constant.rules.Ability;
import com.gpt.oozengine.constant.rules.Activation;
import com.gpt.oozengine.constant.rules.AreaShape;
import com.gpt.oozengine.constant.rules.AttackKind;
import com.gpt.oozengine.constant.rules.Delivery;
import com.gpt.oozengine.constant.rules.RangeType;
import com.gpt.oozengine.constant.rules.TargetKind;
import com.gpt.oozengine.constant.rules.TimeUnit;
import com.gpt.oozengine.constant.rules.UsesReset;
import com.gpt.oozengine.constant.rules.ValueSource;
import com.gpt.oozengine.model.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import org.hibernate.annotations.BatchSize;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One named thing a creature, item, spell, species, feat, or class can do.
 *
 * <p>This is the single mechanical vocabulary of the whole engine. A monster's
 * Tentacle, a Longsword's attack, Fireball, a Dragonborn's Breath Weapon and a
 * Fighter's Second Wind are all Features: they differ in what owns them and what
 * numbers they carry, not in shape. Modelling them once means the simulator has
 * one thing to execute and an importer has one thing to write.
 *
 * <p><b>Structure.</b> A Feature says <em>when</em> it can be used
 * ({@link #activation}, {@link #usesMax}), <em>what it reaches</em>
 * ({@link #rangeType}, {@link #areaShape}, {@link #targetKind}) and <em>how it
 * decides whether it lands</em> ({@link #delivery}). What actually happens then
 * lives in {@link #effects}, one row per branch — the SRD's own "Hit:",
 * "Failure:", "Success:" labels.
 *
 * <p><b>Ownership.</b> Exactly one of the six owner columns is set, enforced by a
 * database check constraint rather than by convention. Nullable foreign keys were
 * chosen over a polymorphic {@code owner_type}/{@code owner_id} pair because they
 * keep real referential integrity: deleting a monster cannot leave its attacks
 * behind. Owners map the inverse side with {@code @OneToMany(mappedBy = ...)}.
 *
 * <p>{@link #description} always holds the book's own prose. Structured fields
 * are for execution; the prose is what a DM reads, and what a homebrew Feature
 * can carry when nobody has bothered to fill the numbers in.
 */
@Entity
@Table(name = "features")
@Getter
@Setter
@NoArgsConstructor
public class Feature extends BaseEntity {

  // region Identity
  @Column(nullable = false)
  private String name;

  @Column(columnDefinition = "text")
  private String description;

  /** Position within its owner's list, so a stat block's actions keep book order. */
  @Column(nullable = false)
  private int ordinal;
  // endregion

  // region Owner — exactly one, enforced by ck_features_single_owner
  //
  // The owning entity writes these columns through its own
  // @OneToMany + @JoinColumn, so they are read-only here. Mirroring them lets
  // the simulator and the importer query features directly
  // (findByStatBlockId, …) without loading the owner aggregate first.
  @Column(name = "stat_block_id", insertable = false, updatable = false)
  private UUID statBlockId;

  @Column(name = "item_id", insertable = false, updatable = false)
  private UUID itemId;

  @Column(name = "spell_id", insertable = false, updatable = false)
  private UUID spellId;

  @Column(name = "species_id", insertable = false, updatable = false)
  private UUID speciesId;

  @Column(name = "feat_id", insertable = false, updatable = false)
  private UUID featId;

  @Column(name = "vocation_id", insertable = false, updatable = false)
  private UUID vocationId;

  /** Set only for class features: which subclass grants it, if not the base class. */
  @Column(name = "subclass_id")
  private UUID subclassId;

  /** Set only for class features: the level at which it is gained. */
  @Column(name = "vocation_level")
  private Integer vocationLevel;
  // endregion

  // region When it can be used
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 24)
  private Activation activation = Activation.ACTION;

  /** Legendary actions cost 1 or more of a creature's per-round budget. */
  @Column(name = "legendary_cost")
  private Integer legendaryCost;

  /** For {@link Activation#TIMED}: the amount, paired with {@link #activationUnit}. */
  @Column(name = "activation_time")
  private Integer activationTime;

  @Enumerated(EnumType.STRING)
  @Column(name = "activation_unit", length = 16)
  private TimeUnit activationUnit;

  /** What provokes a Reaction, verbatim from the book. */
  @Column(name = "trigger_text", columnDefinition = "text")
  private String triggerText;

  /** Whether the feature can also be used as a Ritual (spells only). */
  @Column(name = "ritual", nullable = false)
  private boolean ritual;
  // endregion

  // region How often
  @Enumerated(EnumType.STRING)
  @Column(name = "uses_reset", nullable = false, length = 16)
  private UsesReset usesReset = UsesReset.AT_WILL;

  @Column(name = "uses_max")
  private Integer usesMax;

  /** "(Recharge 5–6)" is rechargeMin 5, rechargeMax 6, rolled on a d6 each turn. */
  @Column(name = "recharge_min")
  private Integer rechargeMin;

  @Column(name = "recharge_max")
  private Integer rechargeMax;
  // endregion

  // region What it reaches
  @Enumerated(EnumType.STRING)
  @Column(name = "range_type", length = 16)
  private RangeType rangeType;

  @Column(name = "range_feet")
  private Integer rangeFeet;

  /** Long range for a ranged attack, i.e. the 320 in "range 80/320 ft." */
  @Column(name = "range_long_feet")
  private Integer rangeLongFeet;

  @Column(name = "reach_feet")
  private Integer reachFeet;

  @Enumerated(EnumType.STRING)
  @Column(name = "target_kind", length = 24)
  private TargetKind targetKind;

  @Column(name = "target_count")
  private Integer targetCount;

  /** Restrictions the numbers can't carry, e.g. "that is Charmed by the aboleth". */
  @Column(name = "target_filter", columnDefinition = "text")
  private String targetFilter;

  @Enumerated(EnumType.STRING)
  @Column(name = "area_shape", length = 16)
  private AreaShape areaShape;

  @Column(name = "area_size_feet")
  private Integer areaSizeFeet;

  /** Cylinders have a height as well as a radius. */
  @Column(name = "area_height_feet")
  private Integer areaHeightFeet;
  // endregion

  // region How it lands
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private Delivery delivery = Delivery.AUTOMATIC;

  @Enumerated(EnumType.STRING)
  @Column(name = "attack_kind", length = 20)
  private AttackKind attackKind;

  @Column(name = "attack_bonus")
  private Integer attackBonus;

  /**
   * Where {@link #attackBonus} comes from. A stat block's is fixed; a spell's is
   * the caster's spell attack bonus, so the number can't live on the row.
   */
  @Enumerated(EnumType.STRING)
  @Column(name = "attack_bonus_source", length = 24)
  private ValueSource attackBonusSource;

  @Enumerated(EnumType.STRING)
  @Column(name = "save_ability", length = 16)
  private Ability saveAbility;

  @Column(name = "save_dc")
  private Integer saveDc;

  @Enumerated(EnumType.STRING)
  @Column(name = "save_dc_source", length = 24)
  private ValueSource saveDcSource;
  // endregion

  // region What happens
  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  @JoinColumn(name = "feature_id", nullable = false)
  @OrderBy("ordinal ASC")
  // Same reason as StatBlock.features: a page of features resolves its
  // effects in one round trip.
  @BatchSize(size = 64)
  private List<Effect> effects = new ArrayList<>();

  /**
   * For Multiattack and anything else that spends its activation invoking other
   * features. Empty on the vast majority of rows.
   */
  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  @JoinColumn(name = "feature_id", nullable = false)
  @OrderBy("ordinal ASC")
  private List<FeatureComponent> components = new ArrayList<>();
  // endregion

  public void addEffect(Effect e) {
    e.setOrdinal(effects.size());
    effects.add(e);
  }

  public void addComponent(FeatureComponent c) {
    c.setOrdinal(components.size());
    components.add(c);
  }
}
