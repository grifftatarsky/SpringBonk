package com.gpt.oozengine.service;

import com.gpt.oozengine.constant.ContentType;
import com.gpt.oozengine.model.Vocation;
import com.gpt.oozengine.model.dto.request.VocationRequest;
import com.gpt.oozengine.model.dto.response.VocationResponse;
import com.gpt.oozengine.repository.CatalogRepository;
import com.gpt.oozengine.repository.HiddenContentRepository;
import com.gpt.oozengine.repository.VocationRepository;
import java.util.Comparator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class VocationService extends AbstractCatalogService<Vocation, VocationRequest, VocationResponse> {

  private final VocationRepository vocations;
  private final HiddenContentRepository hidden;

  @Override
  protected CatalogRepository<Vocation> repo() {
    return vocations;
  }

  @Override
  protected HiddenContentRepository hiddenRepo() {
    return hidden;
  }

  @Override
  protected ContentType contentType() {
    return ContentType.VOCATION;
  }

  @Override
  protected Vocation instantiate() {
    return new Vocation();
  }

  @Override
  protected Comparator<Vocation> listOrder() {
    return Comparator.comparing(Vocation::getName, String.CASE_INSENSITIVE_ORDER);
  }

  @Override
  protected void apply(VocationRequest r, Vocation v) {
    v.setName(r.name());
    v.setLikes(r.likes());
    v.setComplexity(r.complexity());
    v.setHitDie(r.hitDie());
    v.setCasterProgression(r.casterProgression());
    v.setSpellcastingAbility(r.spellcastingAbility());
    v.setDescription(r.description());
    replace(v.getPrimaryAbilities(), r.primaryAbilities());
    replace(v.getSavingThrowProficiencies(), r.savingThrowProficiencies());
  }

  /** Replaces a managed collection in place; clearing and re-adding keeps
   * Hibernate's orphan tracking happy where assigning a new set would not. */
  private static <T> void replace(java.util.Set<T> target, java.util.Set<T> source) {
    target.clear();
    if (source != null) {
      target.addAll(source);
    }
  }

  @Override
  protected VocationResponse toResponse(Vocation v) {
    return VocationResponse.from(v);
  }
}
