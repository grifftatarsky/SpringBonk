package com.gpt.oozengine.service;

import com.gpt.oozengine.constant.ContentType;
import com.gpt.oozengine.model.Spell;
import com.gpt.oozengine.model.dto.request.SpellRequest;
import com.gpt.oozengine.model.dto.response.SpellResponse;
import com.gpt.oozengine.repository.CatalogRepository;
import com.gpt.oozengine.repository.HiddenContentRepository;
import com.gpt.oozengine.repository.SpellRepository;
import java.util.Comparator;
import org.springframework.stereotype.Service;

/** Spell catalog. Override mechanics live in {@link AbstractCatalogService}. */
@Service
public class SpellService extends AbstractCatalogService<Spell, SpellRequest, SpellResponse> {

  private final SpellRepository spells;
  private final HiddenContentRepository hidden;

  public SpellService(SpellRepository spells, HiddenContentRepository hidden) {
    this.spells = spells;
    this.hidden = hidden;
  }

  @Override
  protected CatalogRepository<Spell> repo() {
    return spells;
  }

  @Override
  protected HiddenContentRepository hiddenRepo() {
    return hidden;
  }

  @Override
  protected ContentType contentType() {
    return ContentType.SPELL;
  }

  @Override
  protected Spell instantiate() {
    return new Spell();
  }

  @Override
  protected Comparator<Spell> listOrder() {
    return Comparator.comparingInt(Spell::getLevel)
        .thenComparing(Spell::getName, String.CASE_INSENSITIVE_ORDER);
  }

  @Override
  protected void apply(SpellRequest r, Spell s) {
    s.setName(r.name());
    s.setLevel(r.level());
    s.setSchool(r.school());
    s.setCastingTime(r.castingTime());
    s.setRange(r.range());
    s.setDuration(r.duration());
    s.setConcentration(r.concentration());
    s.setRitual(r.ritual());
    s.setVerbalComponent(r.verbalComponent());
    s.setSomaticComponent(r.somaticComponent());
    s.setMaterialComponent(r.materialComponent());
    s.setMaterials(r.materials());
    s.setDescription(r.description());
    s.setAtHigherLevels(r.atHigherLevels());
  }

  @Override
  protected SpellResponse toResponse(Spell s) {
    return SpellResponse.from(s);
  }
}
