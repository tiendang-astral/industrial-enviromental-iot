package com.corp.iot.backend.command.entity;

public enum CommandStatus {
    PENDING,
    DISPATCHED,
    ACKNOWLEDGED,
    FAILED,
    TIMED_OUT
}
