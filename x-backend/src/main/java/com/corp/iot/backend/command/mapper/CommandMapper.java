package com.corp.iot.backend.command.mapper;

import com.corp.iot.backend.command.dto.CommandResponse;
import com.corp.iot.backend.command.entity.Command;
import org.springframework.stereotype.Component;

@Component
public class CommandMapper {

    // pinId truyền riêng vì bảng command không lưu pin_id (chỉ lưu pinType/pinNumber trong
    // parameters_json, xem CommandParameters) — pinId đã biết sẵn từ path variable lúc tạo lệnh.
    public CommandResponse toResponse(Command command, Long pinId) {
        return new CommandResponse(
                command.getId(),
                command.getGatewayId(),
                pinId,
                command.getCommandType().name(),
                command.getStatus().name(),
                command.getRequestedAt(),
                command.getTimeoutAt(),
                command.getError()
        );
    }
}
