package com.corp.iot.backend.dashboardtemplate.repository;

import com.corp.iot.backend.dashboardtemplate.entity.DashboardTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DashboardTemplateRepository extends JpaRepository<DashboardTemplate, Long> {
}
