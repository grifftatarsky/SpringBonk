package com.gpt.springbonk.model;

import com.gpt.springbonk.keycloak.KeycloakUser;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(
    name = "candidates",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"book_id", "election_id"})
    }
)
public class Candidate {
  @Id
  @GeneratedValue
  private UUID id;

  @Column(columnDefinition = "TEXT")
  private String pitch;

  @CreationTimestamp
  @Column(name = "created_date", nullable = false, updatable = false)
  private LocalDateTime createdDate;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "election_id", nullable = false)
  private Election election;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "book_id", nullable = false)
  private Book book;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "nominator_id", nullable = false)
  private KeycloakUser nominator;

  @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<Vote> votes = new ArrayList<>();

  public Candidate(
      Election election,
      Book book,
      KeycloakUser nominator
  ) {
    this.election = election;
    this.book = book;
    this.nominator = nominator;
  }

  public void addVote(Vote vote) {
    this.votes.add(vote);
  }
}