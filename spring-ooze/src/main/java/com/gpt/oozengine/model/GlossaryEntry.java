package com.gpt.oozengine.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Rules-glossary entries — a term and its definition. */
@Entity
@Table(name = "glossary_entries")
@Getter
@Setter
@NoArgsConstructor
public class GlossaryEntry extends CatalogContent {

  @Column(nullable = false, columnDefinition = "text")
  private String description;
}
