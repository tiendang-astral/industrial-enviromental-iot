package com.corp.iot.backend.datastream.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateDatastreamRequest(
        @NotBlank String name
) {
}
