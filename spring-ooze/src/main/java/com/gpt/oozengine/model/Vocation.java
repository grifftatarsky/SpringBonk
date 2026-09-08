package com.gpt.oozengine.model;

import com.gpt.oozengine.constant.rules.Ability;
import com.gpt.oozengine.constant.rules.CasterProgression;
import com.gpt.oozengine.constant.rules.Skill;
import com.gpt.oozengine.model.mechanics.Feature;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/// AKA Class, but this is Java, so that's a no-no.
@Entity
@Table(name = "vocations")
@Getter
@Setter
@NoArgsConstructor
public class Vocation extends CatalogContent {

  @Column(nullable = false)
  private String name;

  /** Faces of the class's Hit Point Die: the 10 in d10. */
  @Column(name = "hit_die")
  private Integer hitDie;

  /** One ability for most classes, two for those the book lets you choose between. */
  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "vocation_primary_abilities", joinColumns = @JoinColumn(name = "vocation_id"))
  @Enumerated(EnumType.STRING)
  @Column(name = "ability", nullable = false, length = 16)
  private Set<Ability> primaryAbilities = EnumSet.noneOf(Ability.class);

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "vocation_saving_throws", joinColumns = @JoinColumn(name = "vocation_id"))
  @Enumerated(EnumType.STRING)
  @Column(name = "ability", nullable = false, length = 16)
  private Set<Ability> savingThrowProficiencies = EnumSet.noneOf(Ability.class);

  /** The skills the class may choose from, with how many it picks. */
  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "vocation_skill_options", joinColumns = @JoinColumn(name = "vocation_id"))
  @Enumerated(EnumType.STRING)
  @Column(name = "skill", nullable = false, length = 24)
  private Set<Skill> skillOptions = EnumSet.noneOf(Skill.class);

  @Column(name = "skill_choices")
  private Integer skillChoices;

  @Enumerated(EnumType.STRING)
  @Column(name = "caster_progression", length = 16)
  private CasterProgression casterProgression;

  @Enumerated(EnumType.STRING)
  @Column(name = "spellcasting_ability", length = 16)
  private Ability spellcastingAbility;

  /** Flavour, shown in the finder. */
  private String likes;

  private String complexity;

  @Column(columnDefinition = "text")
  private String description;

  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  // nullable = false is load-bearing: without it Hibernate inserts the child
  // with a null foreign key and updates it afterwards, which trips
  // ck_features_single_owner because the row momentarily has no owner.
  @JoinColumn(name = "vocation_id", nullable = false)
  @OrderBy("level ASC")
  private List<VocationLevel> levels = new ArrayList<>();

  /**
   * Every feature the class grants, base and subclass alike. A subclass feature
   * carries {@code subclassId}; ordering is by the level it is gained at.
   */
  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  @JoinColumn(name = "vocation_id", nullable = false)
  @OrderBy("vocationLevel ASC, ordinal ASC")
  private List<Feature> features = new ArrayList<>();

  public void addFeature(Feature f) {
    f.setOrdinal(features.size());
    features.add(f);
  }
}
