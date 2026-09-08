package com.corp.iot.backend.alertrulegroup.service;

import com.corp.iot.backend.alertrulegroup.dto.AlertRuleGroupDtos.AlertRuleGroupResponse;
import com.corp.iot.backend.alertrulegroup.dto.AlertRuleGroupDtos.SaveAlertRuleGroupRequest;

import java.util.List;

public interface AlertRuleGroupService {

    List<AlertRuleGroupResponse> list();

    AlertRuleGroupResponse create(SaveAlertRuleGroupRequest request);

    AlertRuleGroupResponse update(Long id, SaveAlertRuleGroupRequest request);

    AlertRuleGroupResponse updateStatus(Long id, boolean enabled);

    void delete(Long id);
}
