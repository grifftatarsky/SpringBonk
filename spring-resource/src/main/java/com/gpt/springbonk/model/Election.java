package com.gpt.springbonk.model;

import com.gpt.springbonk.constant.enumeration.election.Status;
import com.gpt.springbonk.keycloak.KeycloakUser;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "elections")
public class Election {
  @Id
  @GeneratedValue
  private UUID id;

  @Column(nullable = false)
  private String title;

  @Column(name = "end_date")
  private ZonedDateTime endDateTime;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private KeycloakUser creator;

  @CreationTimestamp
  @Column(name = "created_date", nullable = false, updatable = false)
  private LocalDateTime createdDate;

  @OneToMany(mappedBy = "election", cascade = CascadeType.ALL, orphanRemoval = true)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private List<Candidate> candidates = new ArrayList<>();

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private Status status = Status.INDEFINITE;

  public Election(String title, ZonedDateTime endDateTime) {
    this.title = title;
    this.endDateTime = endDateTime;
  }
}
