package com.gpt.oozengine.model;

import com.gpt.oozengine.constant.ContentType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A per-user suppression: {@code ownerId} has hidden the base content row
 * {@code baseId} of {@code contentType} from their catalog. Lightweight — it
 * stores no copy of the hidden row's fields, just the reference.
 */
@Entity
@Table(
    name = "hidden_content",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_hidden_owner_type_base",
            columnNames = {"owner_id", "content_type", "base_id"}))
@Getter
@Setter
@NoArgsConstructor
public class HiddenContent extends BaseEntity {

  @Column(name = "owner_id", nullable = false)
  private UUID ownerId;

  @Enumerated(EnumType.STRING)
  @Column(name = "content_type", nullable = false, length = 32)
  private ContentType contentType;

  @Column(name = "base_id", nullable = false)
  private UUID baseId;
}
