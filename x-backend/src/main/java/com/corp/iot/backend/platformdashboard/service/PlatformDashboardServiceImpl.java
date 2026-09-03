package com.corp.iot.backend.platformdashboard.service;

import com.corp.iot.backend.externalsource.repository.ExternalSourceRepository;
import com.corp.iot.backend.gateway.repository.GatewayRepository;
import com.corp.iot.backend.platformdashboard.dto.DailyCountProjection;
import com.corp.iot.backend.platformdashboard.dto.PlatformDashboardSummaryResponse;
import com.corp.iot.backend.platformdashboard.dto.TenantCountProjection;
import com.corp.iot.backend.platformdashboard.dto.TenantStatsResponse;
import com.corp.iot.backend.platformdashboard.dto.TrendPointResponse;
import com.corp.iot.backend.platformdashboard.dto.TrendRange;
import com.corp.iot.backend.tenant.entity.Tenant;
import com.corp.iot.backend.tenant.repository.TenantRepository;
import com.corp.iot.backend.tenantuser.repository.TenantUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlatformDashboardServiceImpl implements PlatformDashboardService {

    private final TenantUserRepository tenantUserRepository;
    private final TenantRepository tenantRepository;
    private final GatewayRepository gatewayRepository;
    private final ExternalSourceRepository externalSourceRepository;

    @Override
    public PlatformDashboardSummaryResponse getSummary() {
        List<Tenant> tenants = tenantRepository.findAllByOrderByNameAsc();
        Map<Long, Long> userCounts = toCountMap(tenantUserRepository.userCountsByTenantNative());
        Map<Long, Long> deviceCounts = toCountMap(gatewayRepository.deviceCountsByTenantNative());
        Map<Long, Long> dataSourceCounts = toCountMap(externalSourceRepository.dataSourceCountsByTenantNative());

        List<TenantStatsResponse> tenantStats = tenants.stream()
                .map(t -> new TenantStatsResponse(
                        t.getId(),
                        t.getName(),
                        userCounts.getOrDefault(t.getId(), 0L),
                        deviceCounts.getOrDefault(t.getId(), 0L),
                        dataSourceCounts.getOrDefault(t.getId(), 0L)))
                .toList();

        return new PlatformDashboardSummaryResponse(
                tenantUserRepository.countAllActiveNative(),
                tenants.size(),
                gatewayRepository.countAllActiveNative(),
                externalSourceRepository.countAllActiveNative(),
                tenantStats
        );
    }

    private Map<Long, Long> toCountMap(List<TenantCountProjection> projections) {
        return projections.stream()
                .collect(Collectors.toMap(TenantCountProjection::getTenantId, TenantCountProjection::getCnt));
    }

    @Override
    public List<TrendPointResponse> getUserTrend(TrendRange range) {
        LocalDate rangeStart = rangeStart(range);
        Instant rangeStartInstant = toStartOfDayInstant(rangeStart);

        long baseline = tenantUserRepository.countActiveCreatedBeforeNative(rangeStartInstant);
        List<DailyCountProjection> daily = tenantUserRepository.countActiveNewSinceNative(rangeStartInstant);
        return buildCumulativeTrend(baseline, daily, rangeStart);
    }

    @Override
    public List<TrendPointResponse> getTenantTrend(TrendRange range) {
        LocalDate rangeStart = rangeStart(range);
        Instant rangeStartInstant = toStartOfDayInstant(rangeStart);

        long baseline = tenantRepository.countCreatedBeforeNative(rangeStartInstant);
        List<DailyCountProjection> daily = tenantRepository.countNewSinceNative(rangeStartInstant);
        return buildCumulativeTrend(baseline, daily, rangeStart);
    }

    private LocalDate rangeStart(TrendRange range) {
        return LocalDate.now(ZoneOffset.UTC).minusDays(range.getDays() - 1L);
    }

    private Instant toStartOfDayInstant(LocalDate date) {
        return date.atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    /** Cộng dồn (cumulative) theo từng ngày trong khoảng, kể cả ngày không có bản ghi mới (carry-forward). */
    private List<TrendPointResponse> buildCumulativeTrend(long baseline, List<DailyCountProjection> daily, LocalDate rangeStart) {
        Map<LocalDate, Long> dailyByDay = daily.stream()
                .collect(Collectors.toMap(DailyCountProjection::getDay, DailyCountProjection::getCnt));

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        List<TrendPointResponse> result = new ArrayList<>();
        long running = baseline;
        for (LocalDate day = rangeStart; !day.isAfter(today); day = day.plusDays(1)) {
            running += dailyByDay.getOrDefault(day, 0L);
            result.add(new TrendPointResponse(day, running));
        }
        return result;
    }
}
