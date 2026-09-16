package com.corp.iot.backend.metric.repository;

import com.corp.iot.backend.metric.entity.Metric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MetricRepository extends JpaRepository<Metric, Long> {

    Optional<Metric> findByCode(String code);

    /**
     * Metric hệ thống + metric riêng của tenant. Metric KHÔNG có @TenantId nên phải lọc tay.
     *
     * Chỉ số tự tạo lên đầu rồi mới tới mới-nhất-trước: thêm xong là thấy ngay ở dòng đầu.
     * `m.name` ở cuối KHÔNG phải cho đẹp — 17 dòng seed chèn bằng `now()` trong cùng một
     * transaction nên trùng y hệt `created_at`, thiếu mốc gỡ hoà thì thứ tự giữa chúng tuỳ
     * Postgres và xáo lại giữa các lần gọi.
     */
    @Query("""
            SELECT m FROM Metric m
            WHERE m.tenantId IS NULL OR m.tenantId = :tenantId
            ORDER BY CASE WHEN m.tenantId IS NULL THEN 1 ELSE 0 END, m.createdAt DESC, m.name
            """)
    List<Metric> findVisible(@Param("tenantId") Long tenantId);

    /** Dòng hệ thống chỉ có một (tenant_id NULL) nên đây là kiểm tra trùng chéo phạm vi sở hữu. */
    @Query("SELECT COUNT(m) > 0 FROM Metric m WHERE lower(m.code) = lower(:code) AND (m.tenantId IS NULL OR m.tenantId = :tenantId)")
    boolean codeTaken(@Param("code") String code, @Param("tenantId") Long tenantId);
}
