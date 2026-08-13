package com.corp.iot.backend.command.dto;

// Khớp unique key thật của gateway_pin (type + pin_number) — xem ARCHITECTURE.md § Flow Command.
public record CommandParameters(String pinType, Integer pinNumber) {
}
