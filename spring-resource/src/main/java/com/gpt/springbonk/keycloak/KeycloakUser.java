package com.gpt.springbonk.keycloak;

import com.gpt.springbonk.constant.ProfileAvatar;
import com.gpt.springbonk.model.Election;
import com.gpt.springbonk.model.Shelf;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "keycloak_user")
public class KeycloakUser {
  @Id
  private UUID id;

  @Column
  private String username;

  @Column
  private String firstName;

  @Column
  private String lastName;

  @ElementCollection
  private List<String> roles;

  @Column
  private String email;

  @Column
  private LocalDateTime created;

  @Column
  private LocalDateTime lastAction;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ProfileAvatar avatar = ProfileAvatar.BOOKLING_EMERALD;

  @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<Shelf> shelves = new HashSet<>();

  @OneToMany(mappedBy = "creator", cascade = CascadeType.ALL, orphanRemoval = true)
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<Election> createdElections = new HashSet<>();

  public static final KeycloakUser ANONYMOUS = new KeycloakUser(
      UUID.fromString("00000000-0000-0000-0000-000000000000"),
      "anonymous",
      "anonymous",
      "anonymous",
      List.of("ROLE_ANONYMOUS"),
      "anonymous@anonymous.com",
      LocalDateTime.now(),
      LocalDateTime.now(),
      ProfileAvatar.BOOKLING_EMERALD
  );

  // Shelfless :)
  public KeycloakUser(
      UUID id,
      String username,
      String firstName,
      String lastName,
      List<String> roles,
      String email,
      LocalDateTime created,
      LocalDateTime lastAction,
      ProfileAvatar avatar
  ) {
    this.id = id;
    this.username = username;
    this.firstName = firstName;
    this.lastName = lastName;
    this.roles = roles;
    this.email = email;
    this.created = created;
    this.lastAction = lastAction;
    this.avatar = avatar;
  }
}
