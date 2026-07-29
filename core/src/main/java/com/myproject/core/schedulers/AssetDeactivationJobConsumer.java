package com.myproject.core.schedulers;

import com.day.cq.replication.ReplicationActionType;
import com.day.cq.replication.Replicator;
import com.myproject.core.services.AssetNotificationService;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ResourceResolverFactory;
import org.apache.sling.event.jobs.Job;
import org.apache.sling.event.jobs.consumer.JobConsumer;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.Session;
import java.util.Collections;
import java.util.Map;

@Component(
    service = JobConsumer.class,
    property = {
        JobConsumer.PROPERTY_TOPICS + "=myproject/job/deactivateAsset"
    }
)
public class AssetDeactivationJobConsumer implements JobConsumer {

    private static final Logger LOG = LoggerFactory.getLogger(AssetDeactivationJobConsumer.class);

    @Reference
    private AssetNotificationService emailService;

    @Reference
    private Replicator replicator;

    @Reference
    private ResourceResolverFactory resolverFactory;

    @Override
    public JobResult process(Job job) {
        String assetPath = (String) job.getProperty("assetPath");
        String initiatorId = (String) job.getProperty("initiatorId");

        LOG.info(">>> Scheduled Time Reached! Processing unpublish for asset ONLY: {} <<<", assetPath);

        Map<String, Object> param = Collections.singletonMap(ResourceResolverFactory.SUBSERVICE, "myproject-service-user");

        try (ResourceResolver resolver = resolverFactory.getServiceResourceResolver(param)) {
            Session session = resolver.adaptTo(Session.class);

            if (session != null) {
                
                // 👉 SIRF ASSET KO UNPUBLISH (DEACTIVATE) KAREIN
                // Page ko touch nahi karenge taaki publish page par broken image show ho
                LOG.info("Initiating Deactivation for asset: {}", assetPath);
                replicator.replicate(session, ReplicationActionType.DEACTIVATE, assetPath);
                LOG.info(">>> Asset successfully unpublished: {} <<<", assetPath);

            } else {
                LOG.error("Could not obtain JCR Session. Unpublish failed for: {}", assetPath);
            }

            // 👉 EMAIL BHEJEIN
            emailService.sendDeactivationEmail(assetPath, initiatorId);
            LOG.info(">>> Email successfully triggered for asset: {} <<<", assetPath);
            
            return JobResult.OK;

        } catch (Exception e) {
            LOG.error("Job Failed for Asset Deactivation/Email: {}", assetPath, e);
            return JobResult.FAILED;
        }
    }
}