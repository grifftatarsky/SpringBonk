package com.gpt.oozengine.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "species")
@Getter
@Setter
@NoArgsConstructor
public class Species extends CatalogContent {

    @Column(nullable = false)
    private String name;

    private String size;

    private String speed;

    @Column(name = "creature_type")
    private String creatureType;

    @Column(columnDefinition = "text")
    private String traits;

    @Column(columnDefinition = "text")
    private String description;
}
