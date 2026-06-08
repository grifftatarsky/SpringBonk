package com.gpt.oozengine.service;

import com.gpt.oozengine.constant.ContentType;
import com.gpt.oozengine.model.WeaponMastery;
import com.gpt.oozengine.model.dto.request.WeaponMasteryRequest;
import com.gpt.oozengine.model.dto.response.WeaponMasteryResponse;
import com.gpt.oozengine.repository.CatalogRepository;
import com.gpt.oozengine.repository.HiddenContentRepository;
import com.gpt.oozengine.repository.WeaponMasteryRepository;
import java.util.Comparator;
import org.springframework.stereotype.Service;

@Service
public class WeaponMasteryService
    extends AbstractCatalogService<WeaponMastery, WeaponMasteryRequest, WeaponMasteryResponse> {

  private final WeaponMasteryRepository masteries;
  private final HiddenContentRepository hidden;

  public WeaponMasteryService(WeaponMasteryRepository masteries, HiddenContentRepository hidden) {
    this.masteries = masteries;
    this.hidden = hidden;
  }

  @Override
  protected CatalogRepository<WeaponMastery> repo() {
    return masteries;
  }

  @Override
  protected HiddenContentRepository hiddenRepo() {
    return hidden;
  }

  @Override
  protected ContentType contentType() {
    return ContentType.WEAPON_MASTERY;
  }

  @Override
  protected WeaponMastery instantiate() {
    return new WeaponMastery();
  }

  @Override
  protected Comparator<WeaponMastery> listOrder() {
    return Comparator.comparing(WeaponMastery::getName, String.CASE_INSENSITIVE_ORDER);
  }

  @Override
  protected void apply(WeaponMasteryRequest r, WeaponMastery w) {
    w.setName(r.name());
    w.setDescription(r.description());
  }

  @Override
  protected WeaponMasteryResponse toResponse(WeaponMastery w) {
    return WeaponMasteryResponse.from(w);
  }
}
