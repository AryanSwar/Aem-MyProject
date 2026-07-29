package com.myproject.core.services.impl;

import com.day.cq.mailer.MessageGateway;
import com.day.cq.mailer.MessageGatewayService;
import com.myproject.core.services.AssetNotificationService;
import org.apache.commons.mail.HtmlEmail;
import org.apache.jackrabbit.api.security.user.Authorizable;
import org.apache.jackrabbit.api.security.user.Group;
import org.apache.jackrabbit.api.security.user.UserManager;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ResourceResolverFactory;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collections;
import java.util.Iterator;
import java.util.Map;

@Component(service = AssetNotificationService.class, immediate = true)
public class AssetNotificationServiceImpl implements AssetNotificationService {

    private static final Logger LOG = LoggerFactory.getLogger(AssetNotificationServiceImpl.class);
    private static final String SERVICE_USER = "myproject-service-user";

    @Reference
    private MessageGatewayService messageGatewayService;

    @Reference
    private ResourceResolverFactory resolverFactory;

    @Override
    public void sendDeactivationEmail(String assetPath, String initiatorId) {
        Map<String, Object> param = Collections.singletonMap(ResourceResolverFactory.SUBSERVICE, SERVICE_USER);
        
        try (ResourceResolver resolver = resolverFactory.getServiceResourceResolver(param)) {
            UserManager userManager = resolver.adaptTo(UserManager.class);
            if (userManager == null) return;

            HtmlEmail email = new HtmlEmail();
            email.setSubject("AEM Alert: Scheduled Deactivation Time Reached");

            // Complete link generate karna (Localhost AEM instance ke liye)
            String aemAssetLink = "http://localhost:4502/assetdetails.html" + assetPath;

            StringBuilder htmlBody = new StringBuilder();
            htmlBody.append("<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;\">");
            
            // Header
            htmlBody.append("<div style=\"background-color: #2c3e50; color: #ffffff; padding: 15px 20px; text-align: center;\">");
            htmlBody.append("<h2 style=\"margin: 0; font-size: 20px;\">Asset Schedule Notification</h2>");
            htmlBody.append("</div>");
            
            // Body Content
            htmlBody.append("<div style=\"padding: 20px; color: #333333; line-height: 1.6; background-color: #ffffff;\">");
            htmlBody.append("<p style=\"font-size: 16px;\">Hello,</p>");
            htmlBody.append("<p style=\"font-size: 15px;\">The scheduled deactivation time (Off Time) has successfully passed for the following asset in the AEM system.</p>");
            
            // Highlighted Details Box with CLICKABLE LINK
            htmlBody.append("<div style=\"background-color: #f8f9fa; padding: 15px; border-left: 4px solid #e74c3c; margin: 20px 0; border-radius: 4px;\">");
            htmlBody.append("<p style=\"margin: 0 0 10px 0;\"><strong style=\"color: #2c3e50;\">Asset Path (Click to View):</strong><br/> ");
            htmlBody.append("<a href=\"").append(aemAssetLink).append("\" style=\"color: #3498db; text-decoration: none; word-break: break-all; font-weight: bold;\">").append(assetPath).append("</a></p>");
            
            htmlBody.append("<p style=\"font-size: 14px; color: #666666;\">Please review the asset if any manual administrative action is required.</p>");
            
            // Footer
            htmlBody.append("<br><p style=\"font-size: 14px; margin-bottom: 0;\">Best Regards,<br><strong style=\"color: #2c3e50;\">AEM System Administrator</strong></p>");
            htmlBody.append("</div>");
            htmlBody.append("</div>");

            email.setHtmlMsg(htmlBody.toString());

            // 1. ADD INITIATOR (User who scheduled it)
            Authorizable initiator = userManager.getAuthorizable(initiatorId);
            boolean hasRecipients = false;
            
            if (initiator != null && initiator.getProperty("profile/email") != null) {
                String initiatorEmail = initiator.getProperty("profile/email")[0].getString();
                email.addTo(initiatorEmail); 
                LOG.info("Added Initiator Email (TO): {}", initiatorEmail);
                hasRecipients = true;
            }

            // 2. ADD ADMIN GROUP 
            Group adminGroup = (Group) userManager.getAuthorizable("administrators");
            if (adminGroup != null) {
                Iterator<Authorizable> members = adminGroup.getMembers();
                while (members.hasNext()) {
                    Authorizable member = members.next();
                    if (!member.isGroup() && member.getProperty("profile/email") != null) {
                        String adminEmail = member.getProperty("profile/email")[0].getString();
                        if (!email.getToAddresses().stream().anyMatch(addr -> addr.getAddress().equalsIgnoreCase(adminEmail))) {
                            email.addTo(adminEmail); 
                            hasRecipients = true;
                        }
                    }
                }
            }

            // SEND EMAIL
            if (hasRecipients) {
                MessageGateway<HtmlEmail> gateway = messageGatewayService.getGateway(HtmlEmail.class);
                if (gateway != null) {
                    gateway.send(email);
                    LOG.info(">>> Email sent successfully with link to asset: {} <<<", assetPath);
                }
            }

        } catch (Exception e) {
            LOG.error("Error sending email for asset deactivation: {}", e.getMessage(), e);
        }
    }
}