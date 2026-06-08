package com.gpt.oozengine.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Conditions — Blinded, Prone, Stunned, and the rest. */
@Entity
@Table(name = "conditions")
@Getter
@Setter
@NoArgsConstructor
public class Condition extends CatalogContent {

  @Column(nullable = false)
  private String name;

  @Column(nullable = false, columnDefinition = "text")
  private String description;
}
