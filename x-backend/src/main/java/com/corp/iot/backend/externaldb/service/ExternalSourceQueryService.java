package com.corp.iot.backend.externaldb.service;

import com.corp.iot.backend.common.crypto.CredentialEncryptionService;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.PreviewResponse;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.SchemaTable;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.TestConnectionResponse;
import com.corp.iot.backend.externalsource.dto.ExternalSourceConnectionConfig;
import com.corp.iot.backend.externalsource.dto.ExternalSourceCredential;
import com.corp.iot.backend.externalsource.entity.ExternalSource;
import com.corp.iot.backend.externalsource.repository.ExternalSourceRepository;
import com.corp.iot.backend.externalsourcejob.util.SqlQueryValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

// Ghép nguồn đã lưu (giải mã credential) với ExternalDbGateway. Tách khỏi Gateway để Gateway
// thuần JDBC, không biết gì về entity/mã hoá — và để nơi gọi dùng được cả 2 dạng: nguồn đã lưu
// (theo id) lẫn thông tin kết nối chưa lưu (form đang điền).
@Service
@RequiredArgsConstructor
public class ExternalSourceQueryService {

    private final ExternalSourceRepository externalSourceRepository;
    private final CredentialEncryptionService credentialEncryptionService;
    private final ExternalDbGateway externalDbGateway;
    private final SqlQueryValidator sqlQueryValidator;
    private final ObjectMapper objectMapper;

    public TestConnectionResponse testConnection(ExternalSourceConnectionConfig config, ExternalSourceCredential credential) {
        return externalDbGateway.test(config, credential);
    }

    public TestConnectionResponse testConnection(Long sourceId) {
        return testConnection(sourceId, null, null);
    }

    public TestConnectionResponse testConnection(Long sourceId, ExternalSourceConnectionConfig configOverride,
                                                 ExternalSourceCredential credentialOverride) {
        ExternalSource source = getOrThrow(sourceId);
        ExternalSourceConnectionConfig config = configOverride != null ? configOverride : source.getConnectionConfig();
        ExternalSourceCredential credential = credentialOverride != null ? credentialOverride : credentialOf(source);
        return externalDbGateway.test(config, credential);
    }

    public List<SchemaTable> listSchema(Long sourceId) {
        ExternalSource source = getOrThrow(sourceId);
        return externalDbGateway.listSchema(source.getConnectionConfig(), credentialOf(source));
    }

    public PreviewResponse preview(Long sourceId, String sql, String timestampColumn) {
        // Chạy thử phải cùng luật với lúc lưu, nếu không người dùng chạy thử xanh rồi lưu lại đỏ.
        sqlQueryValidator.validate(sql);
        ExternalSource source = getOrThrow(sourceId);
        return externalDbGateway.preview(source.getConnectionConfig(), credentialOf(source), sql, timestampColumn);
    }

    private ExternalSourceCredential credentialOf(ExternalSource source) {
        String json = credentialEncryptionService.decrypt(source.getCredentialEncrypted());
        return objectMapper.readValue(json, ExternalSourceCredential.class);
    }

    private ExternalSource getOrThrow(Long id) {
        return externalSourceRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "SOURCE_NOT_FOUND", "Không tìm thấy nguồn dữ liệu"));
    }
}
