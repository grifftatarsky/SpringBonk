package com.gpt.oozengine.repository;

import com.gpt.oozengine.model.GameCharacter;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CharacterRepository extends JpaRepository<GameCharacter, UUID> {

  /** A user's own characters (PCs and NPCs), alphabetical. */
  List<GameCharacter> findByOwnerIdOrderByNameAsc(UUID ownerId);
}
