package com.myproject.core.schedulers;

import com.myproject.core.services.AssetEmailService;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ResourceResolverFactory;
import org.apache.sling.commons.scheduler.ScheduleOptions;
import org.apache.sling.commons.scheduler.Scheduler;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.Node;
import javax.jcr.RepositoryException;
import javax.jcr.Session;
import javax.jcr.query.Query;
import javax.jcr.query.QueryManager;
import javax.jcr.query.QueryResult;
import javax.jcr.query.RowIterator;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Component(immediate = true, service = Runnable.class)
public class AssetExpiryScheduler implements Runnable {

    private static final Logger log = LoggerFactory.getLogger(AssetExpiryScheduler.class);

    @Reference
    private Scheduler scheduler;

    @Reference
    private ResourceResolverFactory resourceResolverFactory;

    @Reference
    private AssetEmailService assetEmailService;

    // Run everyday at 1:00 AM
    private static final String CRON_EXPRESSION = "0 * * * * ?"; 

    @Activate
    protected void activate() {
        ScheduleOptions options = scheduler.EXPR(CRON_EXPRESSION);
        options.name("Asset Expiry Notification Scheduler");
        options.canRunConcurrently(false);
        scheduler.schedule(this, options);
        log.info("Asset Expiry Scheduler Activated");
    }

    @Override
    public void run() {
        log.info("Running Asset Expiry Scheduler...");
        
        try {
            Map<String, Object> authInfo = Collections.singletonMap(ResourceResolverFactory.SUBSERVICE, "emailServiceUser");
            try (ResourceResolver resolver = resourceResolverFactory.getServiceResourceResolver(authInfo)) {
                Session session = resolver.adaptTo(Session.class);
                if (session != null) {
                    QueryManager queryManager = session.getWorkspace().getQueryManager();
                    
                    // Simple SQL2 query to find assets that have an expiration date property
                    String statement = "SELECT * FROM [dam:Asset] AS s WHERE ISDESCENDANTNODE(s, '/content/dam/myproject/asset-expiry') AND s.[jcr:content/metadata/prism:expirationDate] IS NOT NULL";
                    Query query = queryManager.createQuery(statement, Query.JCR_SQL2);
                    QueryResult result = query.execute();
                    RowIterator rowIterator = result.getRows();

                    while (rowIterator.hasNext()) {
                        Node assetNode = rowIterator.nextRow().getNode();
                        Node metadataNode = assetNode.getNode("jcr:content/metadata");
                        
                        if (metadataNode.hasProperty("prism:expirationDate")) {
                            Calendar expiryDate = metadataNode.getProperty("prism:expirationDate").getDate();
                            
                            // Check if exactly 10 days are left
                            if (isExactlyTenDaysFromNow(expiryDate)) {
                                sendNotification(assetNode.getName(), assetNode.getPath(), expiryDate);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error in Asset Expiry Scheduler: ", e);
        }
    }

    private boolean isExactlyTenDaysFromNow(Calendar expiryDate) {
        Calendar today = Calendar.getInstance();
        today.add(Calendar.DAY_OF_MONTH, 10); // Add 10 days to current date
        
        // Compare Year, Month, and Day (Ignoring time)
        return (today.get(Calendar.YEAR) == expiryDate.get(Calendar.YEAR)) &&
               (today.get(Calendar.DAY_OF_YEAR) == expiryDate.get(Calendar.DAY_OF_YEAR));
    }

    private void sendNotification(String assetName, String assetPath, Calendar expiryDate) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
        String formattedDate = sdf.format(expiryDate.getTime());

        Map<String, String> emailParams = new HashMap<>();
        emailParams.put("assetName", assetName);
        emailParams.put("assetPath", assetPath);
        emailParams.put("expiryDate", formattedDate);

        String templatePath = "/apps/myproject/mail-templates/asset-expiry.html";
        String recipientEmail = "swarnakarshubham5678@gmail.com"; // Yahan aap properties/metadata se author ka mail utha sakte hain

        assetEmailService.sendEmail(templatePath, emailParams, recipientEmail);
    }
}