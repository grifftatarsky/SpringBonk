package com.gpt.oozengine.service;

import com.gpt.oozengine.model.GameCharacter;
import com.gpt.oozengine.model.dto.request.CharacterRequest;
import com.gpt.oozengine.model.dto.response.CharacterResponse;
import com.gpt.oozengine.repository.CharacterRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * User-scoped characters. Each user only ever sees and edits their own — there
 * is no shared base content, so this doesn't use the override machinery.
 */
@Service
@RequiredArgsConstructor
public class CharacterService {

  private final CharacterRepository characters;

  @Transactional(readOnly = true)
  public List<CharacterResponse> list(UUID userId) {
    if (userId == null) {
      return List.of();
    }
    return characters.findByOwnerIdOrderByNameAsc(userId).stream()
        .map(CharacterResponse::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public CharacterResponse get(UUID id, UUID userId) {
    return CharacterResponse.from(owned(id, userId));
  }

  @Transactional
  public CharacterResponse create(CharacterRequest req, UUID userId) {
    GameCharacter c = new GameCharacter();
    apply(req, c);
    c.setOwnerId(userId);
    return CharacterResponse.from(characters.save(c));
  }

  @Transactional
  public CharacterResponse update(UUID id, CharacterRequest req, UUID userId) {
    GameCharacter c = owned(id, userId);
    apply(req, c);
    return CharacterResponse.from(characters.save(c));
  }

  @Transactional
  public void delete(UUID id, UUID userId) {
    characters.delete(owned(id, userId));
  }

  /** Fetch a character the caller owns, or 404 (also hides others' rows). */
  private GameCharacter owned(UUID id, UUID userId) {
    GameCharacter c =
        characters
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found"));
    if (userId == null || !userId.equals(c.getOwnerId())) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found");
    }
    return c;
  }

  private void apply(CharacterRequest r, GameCharacter c) {
    c.setName(r.name());
    c.setKind(r.kind());
    c.setSpecies(r.species());
    c.setCharacterClass(r.characterClass());
    c.setBackground(r.background());
    c.setAlignment(r.alignment());
    c.setLevel(r.level());
    c.setArmorClass(r.armorClass());
    c.setHitPoints(r.hitPoints());
    c.setStrength(r.strength());
    c.setDexterity(r.dexterity());
    c.setConstitution(r.constitution());
    c.setIntelligence(r.intelligence());
    c.setWisdom(r.wisdom());
    c.setCharisma(r.charisma());
    c.setDescription(r.description());
    c.setNotes(r.notes());
  }
}
