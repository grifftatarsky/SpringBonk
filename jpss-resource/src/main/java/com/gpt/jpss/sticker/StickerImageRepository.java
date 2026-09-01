package com.gpt.jpss.sticker;

import com.gpt.jpss.sticker.model.StickerImage;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StickerImageRepository extends JpaRepository<StickerImage, UUID> {
}
