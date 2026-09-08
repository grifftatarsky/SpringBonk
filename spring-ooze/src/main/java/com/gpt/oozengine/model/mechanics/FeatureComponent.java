package com.gpt.oozengine.model.mechanics;

import com.gpt.oozengine.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One line of a Multiattack: "makes two Tentacle attacks" is a component
 * pointing at the Tentacle feature with a count of 2.
 *
 * <p>Modelled as a reference rather than by duplicating the attack, so that
 * editing Tentacle's damage changes what Multiattack does — which is what a DM
 * means when they buff a monster's attack.
 *
 * <p>{@link #optional} carries the SRD's "and uses either Consume Memories or
 * Dominate Mind if available": components a battle plan may choose between
 * rather than a fixed sequence.
 */
@Entity
@Table(name = "feature_components")
@Getter
@Setter
@NoArgsConstructor
public class FeatureComponent extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "references_feature_id", nullable = false)
  private Feature referencedFeature;

  @Column(nullable = false)
  private int count = 1;

  @Column(nullable = false)
  private boolean optional;

  @Column(nullable = false)
  private int ordinal;
}
