package com.gpt.oozengine.model;

import com.gpt.oozengine.constant.rules.ItemCategory;
import com.gpt.oozengine.constant.rules.Rarity;
import com.gpt.oozengine.model.item.ArmorDetail;
import com.gpt.oozengine.model.item.WeaponDetail;
import com.gpt.oozengine.model.mechanics.Feature;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Weapons, armor, gear, and magic items. */
@Entity
@Table(name = "items")
@Getter
@Setter
@NoArgsConstructor
public class Item extends CatalogContent {

  @Column(nullable = false)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(name = "item_category", length = 24)
  private ItemCategory itemCategory;

  @Enumerated(EnumType.STRING)
  @Column(name = "rarity_tier", length = 16)
  private Rarity rarityTier;

  @Column(nullable = false)
  private boolean attunement;

  /** What the attunement is restricted to, where the book restricts it. */
  @Column(name = "attunement_note")
  private String attunementNote;

  /** Cost in gold pieces; a Copper Piece is 0.01. Null for items with no price. */
  @Column(name = "cost_gp", precision = 12, scale = 2)
  private BigDecimal costGp;

  @Column(name = "weight_lb", precision = 8, scale = 2)
  private BigDecimal weightLb;

  @Column(nullable = false, columnDefinition = "text")
  private String description;

  /** Present only on weapons; every column is null otherwise. */
  @Embedded private WeaponDetail weapon;

  /** Present only on armor and shields. */
  @Embedded private ArmorDetail armor;

  /**
   * What the item lets its holder do. A Longsword's attack, a Potion of Healing's
   * 2d4 + 2, a Bag of Holding's capacity rules — all the same shape as a
   * monster's actions, which is what lets one combat engine handle both.
   */
  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  // nullable = false is load-bearing: without it Hibernate inserts the child
  // with a null foreign key and updates it afterwards, which trips
  // ck_features_single_owner because the row momentarily has no owner.
  @JoinColumn(name = "item_id", nullable = false)
  @OrderBy("ordinal ASC")
  private List<Feature> features = new ArrayList<>();

  public void addFeature(Feature f) {
    f.setOrdinal(features.size());
    features.add(f);
  }
}
