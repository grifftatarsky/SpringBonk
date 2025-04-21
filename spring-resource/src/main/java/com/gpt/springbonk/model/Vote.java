package com.gpt.springbonk.model;

import com.gpt.springbonk.keycloak.KeycloakUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "votes")
public class Vote {
  @Id
  @GeneratedValue
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "voter_id", nullable = false)
  private KeycloakUser voter;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "candidate_id", nullable = false)
  private Candidate candidate;

  @Column(nullable = false)
  private Integer rank;

  public Vote(KeycloakUser voter, Candidate candidate, Integer rank) {
    this.voter = voter;
    this.candidate = candidate;
    this.rank = rank;
  }
}