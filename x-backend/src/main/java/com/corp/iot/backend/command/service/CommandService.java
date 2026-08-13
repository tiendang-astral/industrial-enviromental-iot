package com.corp.iot.backend.command.service;

import com.corp.iot.backend.command.dto.CommandResponse;
import com.corp.iot.backend.command.dto.CreateCommandRequest;

public interface CommandService {

    CommandResponse create(Long gatewayId, Long pinId, CreateCommandRequest request);
}
