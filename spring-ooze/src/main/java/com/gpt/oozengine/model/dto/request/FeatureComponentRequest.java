package com.gpt.oozengine.model.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * One line of a Multiattack.
 *
 * <p>References an existing feature by id. A component pointing at a feature
 * created in the same save has no id to point at yet, so that case needs two
 * saves — deliberately, rather than inventing client-side placeholder ids.
 */
public record FeatureComponentRequest(
    UUID id, @NotNull UUID referencedFeatureId, int count, boolean optional) {}
