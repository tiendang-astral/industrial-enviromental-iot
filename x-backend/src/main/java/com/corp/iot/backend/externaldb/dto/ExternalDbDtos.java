package com.corp.iot.backend.externaldb.dto;

import com.corp.iot.backend.externalsource.dto.ExternalSourceConnectionConfig;
import com.corp.iot.backend.externalsource.dto.ExternalSourceCredential;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

// DTO cho 3 endpoint đọc trực tiếp database ngoài: thử kết nối, đọc cấu trúc bảng, chạy thử.
// Gom một file vì đều nhỏ và chỉ dùng chung trong module externaldb.
public final class ExternalDbDtos {

    private ExternalDbDtos() {
    }

    // credential bỏ trống khi thử lại nguồn đã lưu — service lấy credential đã mã hoá trong DB.
    public record TestConnectionRequest(
            @NotNull @Valid ExternalSourceConnectionConfig connectionConfig,
            @Valid ExternalSourceCredential credential
    ) {
    }

    // Thử nguồn ĐÃ LƯU, cho phép ghi đè từng phần: sửa host mà không nhập lại mật khẩu thì
    // dùng credential đã lưu; đổi mật khẩu thì dùng cái vừa gõ.
    public record TestSavedConnectionRequest(
            @Valid ExternalSourceConnectionConfig connectionConfig,
            @Valid ExternalSourceCredential credential
    ) {
    }

    public record TestConnectionResponse(
            boolean ok,
            String serverVersion,
            Integer latencyMs,
            Integer tableCount,
            boolean writable,
            String errorCode,
            String errorMessage
    ) {
    }

    public record SchemaColumn(String name, String dataType, boolean timestamp, boolean numeric) {
    }

    public record SchemaTable(String schema, String name, Long estimatedRows, List<SchemaColumn> columns) {
    }

    // timestampColumn KHÔNG bắt buộc: lúc chạy thử lần đầu người dùng chưa biết truy vấn trả về
    // cột nào để mà chọn — danh sách cột chính là thứ lần chạy này sinh ra. Bỏ trống thì chỉ chạy
    // câu và trả cột về; có giá trị thì kiểm luôn cột đó có trong kết quả không.
    public record PreviewRequest(
            @NotBlank String sql,
            String timestampColumn
    ) {
    }

    public record PreviewColumn(String name, String dataType, boolean numeric) {
    }

    public record PreviewResponse(
            List<PreviewColumn> columns,
            List<List<Object>> rows,
            int rowCount,
            long elapsedMs
    ) {
    }

    // rowCount null = đếm không kịp trong statement_timeout. Hiện khoảng thời gian thay vì
    // đưa ra một con số bịa — người dùng vẫn quyết định được, chỉ là ít thông tin hơn.
    public record BackfillEstimateResponse(
            Long rowCount,
            java.time.Instant targetFrom,
            java.time.Instant coveredFrom,
            long elapsedMs
    ) {
    }
}
