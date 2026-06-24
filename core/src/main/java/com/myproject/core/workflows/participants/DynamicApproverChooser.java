package com.myproject.core.workflows.participants;

import com.adobe.granite.workflow.WorkflowException;
import com.adobe.granite.workflow.WorkflowSession;
import com.adobe.granite.workflow.exec.ParticipantStepChooser;
import com.adobe.granite.workflow.exec.WorkItem;
import com.adobe.granite.workflow.metadata.MetaDataMap;
import com.myproject.core.workflows.config.WorkflowApprovalConfig;
import org.apache.jackrabbit.api.security.user.Authorizable;
import org.apache.jackrabbit.api.security.user.UserManager;
import org.apache.sling.api.resource.ResourceResolver;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.metatype.annotations.Designate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component(
    service = ParticipantStepChooser.class,
    property = { "chooser.label=Custom - Dynamic Multi-Level Approver Chooser" }
)
@Designate(ocd = WorkflowApprovalConfig.class)
public class DynamicApproverChooser implements ParticipantStepChooser {

    private static final Logger log = LoggerFactory.getLogger(DynamicApproverChooser.class);
    private WorkflowApprovalConfig config;

    @Activate
    protected void activate(WorkflowApprovalConfig config) {
        this.config = config;
    }

    @Override
    public String getParticipant(WorkItem workItem, WorkflowSession session, MetaDataMap args) throws WorkflowException {
        String stepType = args.get("PROCESS_ARGS", "CONTENT_OWNER").trim().toUpperCase();
        String targetGroup;

        // 1. Decide Target Group
        switch (stepType) {
            case "LEGAL":     targetGroup = config.legal_approver_group(); break;
            case "MARKETING": targetGroup = config.marketing_approver_group(); break;
            default:          targetGroup = config.content_owner_group(); break;
        }

        // 2. Safely Check for Inactive State (Avoid Permission Trap)
        try (ResourceResolver resolver = session.adaptTo(ResourceResolver.class)) {
            if (resolver != null) {
                UserManager userManager = resolver.adaptTo(UserManager.class);
                if (userManager != null) {
                    Authorizable auth = userManager.getAuthorizable(targetGroup);
                    
                    // SIRF tab fallback karna hai jab hume group dikhe AUR wo explicitly disabled ho
                    if (auth != null && auth.hasProperty("rep:disabled")) {
                        log.warn("Target group [{}] is explicitly DISABLED. Reassigning to Admin.", targetGroup);
                        return config.fallback_admin_group();
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to read user manager, ignoring validation. Error: " + e.getMessage());
        }

        // 3. Directly assign to the required group (Bypasses the workflow-service permission issue)
        log.info("Routing Task to Group: {}", targetGroup);
        return targetGroup;
    }
}