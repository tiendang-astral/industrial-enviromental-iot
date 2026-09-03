package com.corp.iot.backend.externalsourcejob.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

// queryConfig/scheduleCron null = giữ nguyên. Đổi timestampColumn sẽ reset cursor về epoch —
// mốc cũ đo theo cột khác nên không còn nghĩa (xem ExternalSourceJobServiceImpl.update).
public record UpdateExternalSourceJobRequest(
        @NotBlank String name,
        @Valid ExternalSourceQueryConfig queryConfig,
        String scheduleCron
) {
}
