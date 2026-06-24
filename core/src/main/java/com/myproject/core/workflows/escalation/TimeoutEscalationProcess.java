package com.myproject.core.workflows.escalation;

import com.adobe.granite.workflow.WorkflowException;
import com.adobe.granite.workflow.WorkflowSession;
import com.adobe.granite.workflow.exec.WorkItem;
import com.adobe.granite.workflow.exec.WorkflowProcess;
import com.adobe.granite.workflow.metadata.MetaDataMap;
import com.day.cq.mailer.MessageGateway;
import com.day.cq.mailer.MessageGatewayService;
import com.day.cq.wcm.api.Page;
import com.day.cq.wcm.api.PageManager;
import com.myproject.core.workflows.config.WorkflowApprovalConfig;
import org.apache.commons.mail.HtmlEmail;
import org.apache.jackrabbit.api.security.user.Authorizable;
import org.apache.jackrabbit.api.security.user.Group;
import org.apache.jackrabbit.api.security.user.UserManager;
import org.apache.sling.api.resource.ResourceResolver;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.metatype.annotations.Designate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// Fix: Imported JCR Value class
import javax.jcr.Value;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Component(
    service = WorkflowProcess.class,
    property = { "process.label=Custom - SLA Timeout Escalation Handler" }
)
@Designate(ocd = WorkflowApprovalConfig.class)
public class TimeoutEscalationProcess implements WorkflowProcess {

    private static final Logger log = LoggerFactory.getLogger(TimeoutEscalationProcess.class);

    @Reference
    private MessageGatewayService messageGatewayService;

    private WorkflowApprovalConfig config;

    @Activate
    protected void activate(WorkflowApprovalConfig config) {
        this.config = config;
    }

    @Override
    public void execute(WorkItem workItem, WorkflowSession session, MetaDataMap args) throws WorkflowException {
        String payloadPath = workItem.getWorkflowData().getPayload().toString();
        String currentAssignee = workItem.getCurrentAssignee();

        try (ResourceResolver resolver = session.adaptTo(ResourceResolver.class)) {
            PageManager pageManager = resolver.adaptTo(PageManager.class);
            Page page = pageManager.getPage(payloadPath);
            String pageTitle = (page != null) ? page.getTitle() : payloadPath;

            // Collect emails of the lazy group + fallback admins
            List<String> recipients = getGroupMemberEmails(resolver, currentAssignee);
            recipients.addAll(getGroupMemberEmails(resolver, config.fallback_admin_group()));

            if (!recipients.isEmpty()) {
                sendHtmlEmail(recipients, pageTitle, payloadPath, currentAssignee);
            } else {
                log.error("Escalation aborted: No emails found inside group [{}]", currentAssignee);
            }
        } catch (Exception e) {
            log.error("SLA Escalation trigger failed", e);
        }
    }

    private List<String> getGroupMemberEmails(ResourceResolver resolver, String groupId) {
        List<String> emails = new ArrayList<>();
        try {
            UserManager userManager = resolver.adaptTo(UserManager.class);
            if (userManager != null) {
                Authorizable auth = userManager.getAuthorizable(groupId);
                if (auth != null && auth.isGroup()) {
                    Iterator<Authorizable> members = ((Group) auth).getMembers();
                    while (members.hasNext()) {
                        Authorizable member = members.next();
                        
                        // Check if it's an active user
                        if (!member.isGroup() && !member.hasProperty("rep:disabled")) {
                            
                            // Fix: Correct Jackrabbit Property fetching logic
                            Value[] emailValues = member.getProperty("profile/email");
                            if (emailValues != null && emailValues.length > 0) {
                                String email = emailValues[0].getString();
                                if (email != null && !email.trim().isEmpty()) {
                                    emails.add(email);
                                }
                            }
                            
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not extract emails for group: " + groupId, e);
        }
        return emails;
    }

    private void sendHtmlEmail(List<String> recipients, String title, String path, String assignee) {
        try {
            MessageGateway<HtmlEmail> gateway = messageGatewayService.getGateway(HtmlEmail.class);
            if (gateway == null) {
                log.error("MessageGatewayService is null. Please configure Day CQ Mail Service in OSGi.");
                return;
            }

            HtmlEmail email = new HtmlEmail();
            email.setCharset("UTF-8");
            email.setFrom(config.escalation_from_email(), "AEM Workflow Guard");
            email.setSubject("⚠️ SLA Breach: Approval pending for " + title);
            
            String msg = "<h3>Action Required: Workflow SLA Breached</h3>"
                       + "<p>The following page has been sitting in Inbox for over <b>48 Hours</b>:</p>"
                       + "<ul><li><b>Page:</b> " + title + "</li>"
                       + "<li><b>Path:</b> " + path + "</li>"
                       + "<li><b>Pending with:</b> " + assignee + "</li></ul>"
                       + "<p>Please take action inside the AEM Inbox.</p>";

            email.setHtmlMsg(msg);
            
            for (String to : recipients) {
                email.addTo(to);
            }

            gateway.send(email);
            log.info("Escalation sent to {} users.", recipients.size());

        } catch (Exception e) {
            log.error("Email dispatch failed", e);
        }
    }
}