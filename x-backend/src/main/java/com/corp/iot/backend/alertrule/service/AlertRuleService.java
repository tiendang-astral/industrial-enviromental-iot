package com.corp.iot.backend.alertrule.service;

import com.corp.iot.backend.alertrule.dto.AlertRuleResponse;
import com.corp.iot.backend.alertrule.dto.CreateAlertRuleRequest;
import com.corp.iot.backend.alertrule.dto.UpdateAlertRuleRequest;

import java.util.List;

public interface AlertRuleService {

    List<AlertRuleResponse> list(Long tenantNodeId, boolean includeDescendants);

    AlertRuleResponse create(CreateAlertRuleRequest request);

    AlertRuleResponse update(Long id, UpdateAlertRuleRequest request);

    AlertRuleResponse updateStatus(Long id, boolean enabled);

    void delete(Long id);
}
