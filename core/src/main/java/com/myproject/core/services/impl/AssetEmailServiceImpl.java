package com.myproject.core.services.impl;

import com.day.cq.mailer.MessageGateway;
import com.day.cq.mailer.MessageGatewayService;
import com.myproject.core.services.AssetEmailService;
import org.apache.commons.mail.HtmlEmail;
import org.apache.commons.io.IOUtils;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ResourceResolverFactory;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;

@Component(service = AssetEmailService.class, immediate = true)
public class AssetEmailServiceImpl implements AssetEmailService {

    private static final Logger log = LoggerFactory.getLogger(AssetEmailServiceImpl.class);

    @Reference
    private MessageGatewayService messageGatewayService;

    @Reference
    private ResourceResolverFactory resourceResolverFactory;

    @Override
    public void sendEmail(String templatePath, Map<String, String> emailParams, String recipientEmail) {
        try {
            // System user authentication map
            Map<String, Object> authInfo = Collections.singletonMap(ResourceResolverFactory.SUBSERVICE, "emailServiceUser");
            
            try (ResourceResolver resourceResolver = resourceResolverFactory.getServiceResourceResolver(authInfo)) {
                
                // 1. SAFELY READ TEMPLATE FROM JCR
                String templateContent = "";
                Resource templateResource = resourceResolver.getResource(templatePath);
                
                if (templateResource != null) {
                    // Files in AEM adapt to InputStream, not directly to String
                    InputStream inputStream = templateResource.adaptTo(InputStream.class);
                    if (inputStream != null) {
                        // Use standard AEM built-in IOUtils to convert stream to String
                        templateContent = IOUtils.toString(inputStream, StandardCharsets.UTF_8);
                    } else {
                        log.error("Could not adapt template resource to InputStream at path: {}", templatePath);
                        return; // Stop execution if file can't be read
                    }
                } else {
                    log.error("Email template not found at path: {}", templatePath);
                    return; // Stop execution if template doesn't exist
                }
                
                // 2. ERROR FIX: REPLACE VARIABLES WITHOUT EXTERNAL DEPENDENCY
                String finalEmailBody = templateContent;
                if (emailParams != null) {
                    for (Map.Entry<String, String> entry : emailParams.entrySet()) {
                        // This dynamically replaces ${assetName}, ${expiryDate}, etc.
                        finalEmailBody = finalEmailBody.replace("${" + entry.getKey() + "}", entry.getValue());
                    }
                }

                // 3. CONFIGURE AND SEND EMAIL
                HtmlEmail email = new HtmlEmail();
                email.setCharset("UTF-8");
                email.addTo(recipientEmail);
                email.setSubject("AEM Asset Expiry Alert");
                email.setHtmlMsg(finalEmailBody);

                // Send Email via AEM Gateway
                MessageGateway<HtmlEmail> messageGateway = messageGatewayService.getGateway(HtmlEmail.class);
                if (messageGateway != null) {
                    messageGateway.send(email);
                    log.info("Asset Expiry Email sent successfully to {}", recipientEmail);
                } else {
                    log.error("The Message Gateway could not be retrieved.");
                }
            }
        } catch (Exception e) {
            log.error("Error while sending email: ", e);
        }
    }
}