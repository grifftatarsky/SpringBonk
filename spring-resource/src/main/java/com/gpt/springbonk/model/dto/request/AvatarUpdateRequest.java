package com.gpt.springbonk.model.dto.request;

import com.gpt.springbonk.constant.ProfileAvatar;
import jakarta.validation.constraints.NotNull;

public record AvatarUpdateRequest(@NotNull ProfileAvatar avatar) {
}
