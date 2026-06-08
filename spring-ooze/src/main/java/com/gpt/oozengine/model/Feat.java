package com.gpt.oozengine.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Feats — Origin, General, Fighting Style, and Epic Boon. */
@Entity
@Table(name = "feats")
@Getter
@Setter
@NoArgsConstructor
public class Feat extends CatalogContent {

  @Column(nullable = false)
  private String name;

  /** Free-text category, e.g. "Origin", "General", "Fighting Style", "Epic Boon". */
  @Column(name = "feat_category", nullable = false)
  private String featCategory;

  /** Prerequisite text, e.g. "Level 4+"; null if none. */
  private String prerequisite;

  @Column(nullable = false, columnDefinition = "text")
  private String description;
}
