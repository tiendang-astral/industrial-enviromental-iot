package com.corp.iot.backend.metric.service;

import com.corp.iot.backend.alertrule.repository.AlertRuleRepository;
import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.common.security.AppUserPrincipal;
import com.corp.iot.backend.datastream.repository.DatastreamRepository;
import com.corp.iot.backend.gatewaypin.repository.GatewayPinRepository;
import com.corp.iot.backend.metric.dto.CreateMetricRequest;
import com.corp.iot.backend.metric.dto.MetricResponse;
import com.corp.iot.backend.metric.dto.UpdateMetricRequest;
import com.corp.iot.backend.metric.dto.UpdateMetricThresholdRequest;
import com.corp.iot.backend.metric.entity.Metric;
import com.corp.iot.backend.metric.entity.TenantMetricSetting;
import com.corp.iot.backend.metric.mapper.MetricMapper;
import com.corp.iot.backend.metric.repository.MetricRepository;
import com.corp.iot.backend.metric.repository.TenantMetricSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class MetricServiceImpl implements MetricService {

    /** Khớp ck_metric_color (V26) — token nào cũng đã có sẵn bản light lẫn dark trong index.css. */
    private static final Set<String> ALLOWED_COLORS =
            Set.of("chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "chart-6", "neutral");

    /** value_float của InfluxDB là double, nên chỉ kiểu số mới đi hết được đường ghi. */
    private static final String DATA_TYPE_NUMBER = "NUMBER";

    private final MetricRepository metricRepository;
    private final TenantMetricSettingRepository settingRepository;
    private final MetricResolver metricResolver;
    private final MetricMapper metricMapper;
    private final GatewayPinRepository gatewayPinRepository;
    private final DatastreamRepository datastreamRepository;
    private final AlertRuleRepository alertRuleRepository;

    @Override
    @Transactional(readOnly = true)
    public List<MetricResponse> list() {
        return metricResolver.listVisible(currentTenantId()).stream().map(metricMapper::toResponse).toList();
    }

    @Override
    @Transactional
    public MetricResponse create(CreateMetricRequest request) {
        Long tenantId = requireTenant();
        validateColor(request.color());
        // Index uq_metric_code không chặn được trùng với dòng hệ thống (COALESCE tách hai phạm vi),
        // mà trùng thì người dùng thấy hai dòng cùng tên — chặn ở đây.
        if (metricRepository.codeTaken(request.code(), tenantId)) {
            throw new BusinessException(HttpStatus.CONFLICT, "METRIC_CODE_TAKEN",
                    "Mã chỉ số này đã tồn tại");
        }
        Metric metric = new Metric();
        metric.setTenantId(tenantId);
        metric.setCode(request.code());
        metric.setName(request.name());
        metric.setUnit(request.unit());
        metric.setDataType(DATA_TYPE_NUMBER);
        metric.setColor(request.color());
        metric.setCreatedBy(currentUserId());
        metric.setUpdatedBy(currentUserId());
        metricRepository.save(metric);

        if (request.minValue() != null || request.maxValue() != null) {
            writeThreshold(metric, request.minValue(), request.maxValue());
        }
        return metricMapper.toResponse(metricResolver.resolve(metric));
    }

    @Override
    @Transactional
    public MetricResponse update(Long id, UpdateMetricRequest request) {
        Metric metric = requireOwnMetric(id);
        validateColor(request.color());
        metric.setName(request.name());
        metric.setUnit(request.unit());
        metric.setColor(request.color());
        metric.setUpdatedBy(currentUserId());
        metricRepository.save(metric);
        return metricMapper.toResponse(metricResolver.resolve(metric));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Metric metric = requireOwnMetric(id);
        if (gatewayPinRepository.existsByMetricId(id)
                || datastreamRepository.existsByMetricId(id)
                || alertRuleRepository.existsByMetricId(id)) {
            throw new BusinessException(HttpStatus.CONFLICT, "METRIC_IN_USE",
                    "Chỉ số đang được dùng bởi chân cảm biến, kênh dữ liệu hoặc quy tắc cảnh báo");
        }
        settingRepository.deleteByMetricId(id);
        metricRepository.delete(metric);
    }

    @Override
    @Transactional
    public MetricResponse setThreshold(Long id, UpdateMetricThresholdRequest request) {
        Metric metric = requireVisibleMetric(id);
        writeThreshold(metric, request.minValue(), request.maxValue());
        return metricMapper.toResponse(metricResolver.resolve(metric));
    }

    @Override
    @Transactional
    public MetricResponse resetThreshold(Long id) {
        Metric metric = requireVisibleMetric(id);
        settingRepository.findByMetricId(id).ifPresent(settingRepository::delete);
        return metricMapper.toResponse(metricResolver.resolve(metric));
    }

    private void writeThreshold(Metric metric, Double minValue, Double maxValue) {
        if (minValue == null || maxValue == null || minValue >= maxValue) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_THRESHOLD",
                    "Ngưỡng dưới phải nhỏ hơn ngưỡng trên và không được bỏ trống");
        }
        TenantMetricSetting setting = settingRepository.findByMetricId(metric.getId())
                .orElseGet(() -> {
                    TenantMetricSetting created = new TenantMetricSetting();
                    created.setMetricId(metric.getId());
                    created.setCreatedBy(currentUserId());
                    return created;
                });
        setting.setMinValue(minValue);
        setting.setMaxValue(maxValue);
        setting.setUpdatedBy(currentUserId());
        settingRepository.save(setting);
    }

    private void validateColor(String color) {
        if (!ALLOWED_COLORS.contains(color)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_COLOR", "Màu không hợp lệ");
        }
    }

    /** Chỉ số hệ thống dùng chung mọi tenant nên chỉ sửa được ngưỡng, không sửa định nghĩa. */
    private Metric requireOwnMetric(Long id) {
        Metric metric = requireVisibleMetric(id);
        if (metric.getTenantId() == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "SYSTEM_METRIC_READONLY",
                    "Chỉ số hệ thống chỉ đổi được ngưỡng");
        }
        return metric;
    }

    // Metric không có @TenantId nên findById trả về cả chỉ số của tenant khác — phải tự chặn.
    private Metric requireVisibleMetric(Long id) {
        Metric metric = metricRepository.findById(id)
                .filter(m -> m.getTenantId() == null || m.getTenantId().equals(currentTenantId()))
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "METRIC_NOT_FOUND",
                        "Không tìm thấy chỉ số"));
        return metric;
    }

    private Long requireTenant() {
        Long tenantId = currentTenantId();
        if (tenantId == null) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "TENANT_REQUIRED",
                    "Chỉ tài khoản trong tenant mới tạo được chỉ số");
        }
        return tenantId;
    }

    private Long currentTenantId() {
        return currentPrincipal().tenantId();
    }

    private Long currentUserId() {
        return currentPrincipal().userId();
    }

    private AppUserPrincipal currentPrincipal() {
        return (AppUserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
