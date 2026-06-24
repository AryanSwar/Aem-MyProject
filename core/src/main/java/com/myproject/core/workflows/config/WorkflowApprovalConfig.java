package com.myproject.core.workflows.config;

import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;

@ObjectClassDefinition(name = "Dynamic Workflow Approval Configuration", description = "Defines approver groups and SLA settings")
public @interface WorkflowApprovalConfig {

    @AttributeDefinition(name = "Content Owners Group", description = "Group ID for standard content owners")
    String content_owner_group() default "content-authors-group";

    @AttributeDefinition(name = "Legal Approvers Group", description = "Group ID for Legal team")
    String legal_approver_group() default "legal-approvers-group";

    @AttributeDefinition(name = "Marketing Approvers Group", description = "Group ID for Marketing team")
    String marketing_approver_group() default "marketing-approvers-group";

    @AttributeDefinition(name = "Fallback Admin Group", description = "Assigned if target approver group is inactive/empty")
    String fallback_admin_group() default "administrators";

    @AttributeDefinition(name = "Escalation Sender Email", description = "From address for SLA breach emails")
    String escalation_from_email() default "no-reply@yourcompany.com";
}
