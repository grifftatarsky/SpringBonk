package com.gpt.oozengine.service;

import com.gpt.oozengine.constant.ContentType;
import com.gpt.oozengine.model.Background;
import com.gpt.oozengine.model.dto.request.BackgroundRequest;
import com.gpt.oozengine.model.dto.response.BackgroundResponse;
import com.gpt.oozengine.repository.BackgroundRepository;
import com.gpt.oozengine.repository.CatalogRepository;
import com.gpt.oozengine.repository.HiddenContentRepository;
import java.util.Comparator;
import org.springframework.stereotype.Service;

@Service
public class BackgroundService
    extends AbstractCatalogService<Background, BackgroundRequest, BackgroundResponse> {

  private final BackgroundRepository backgrounds;
  private final HiddenContentRepository hidden;

  public BackgroundService(BackgroundRepository backgrounds, HiddenContentRepository hidden) {
    this.backgrounds = backgrounds;
    this.hidden = hidden;
  }

  @Override
  protected CatalogRepository<Background> repo() {
    return backgrounds;
  }

  @Override
  protected HiddenContentRepository hiddenRepo() {
    return hidden;
  }

  @Override
  protected ContentType contentType() {
    return ContentType.BACKGROUND;
  }

  @Override
  protected Background instantiate() {
    return new Background();
  }

  @Override
  protected Comparator<Background> listOrder() {
    return Comparator.comparing(Background::getName, String.CASE_INSENSITIVE_ORDER);
  }

  @Override
  protected void apply(BackgroundRequest r, Background b) {
    b.setName(r.name());
    b.setAbilityScores(r.abilityScores());
    b.setFeat(r.feat());
    b.setSkillProficiencies(r.skillProficiencies());
    b.setToolProficiencies(r.toolProficiencies());
    b.setEquipment(r.equipment());
    b.setDescription(r.description());
  }

  @Override
  protected BackgroundResponse toResponse(Background b) {
    return BackgroundResponse.from(b);
  }
}
