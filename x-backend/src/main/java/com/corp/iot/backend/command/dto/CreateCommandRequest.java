package com.corp.iot.backend.command.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCommandRequest(
        @NotBlank String commandType,
        @NotBlank String idempotencyKey
) {
}
