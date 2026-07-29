package com.myproject.core.listeners;

import org.apache.sling.api.resource.observation.ResourceChange;
import org.apache.sling.api.resource.observation.ResourceChangeListener;
import org.apache.sling.event.jobs.JobBuilder;
import org.apache.sling.event.jobs.JobManager;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ResourceResolverFactory;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ValueMap;

import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component(
    service = ResourceChangeListener.class,
    property = {
        ResourceChangeListener.PATHS + "=/content/dam/myproject/oliverwyman",
        ResourceChangeListener.CHANGES + "=CHANGED",
        ResourceChangeListener.CHANGES + "=ADDED"
    }
)
public class AssetDeactivationListener implements ResourceChangeListener {

    private static final Logger LOG = LoggerFactory.getLogger(AssetDeactivationListener.class);
    private static final String OFFTIME_PROPERTY = "offTime";
    private static final String JOB_TOPIC = "myproject/job/deactivateAsset";

    @Reference
    private JobManager jobManager;

    @Reference
    private ResourceResolverFactory resolverFactory;

    @Override
    public void onChange(List<ResourceChange> changes) {
        Map<String, Object> param = Collections.singletonMap(ResourceResolverFactory.SUBSERVICE, "myproject-service-user");

        try (ResourceResolver resolver = resolverFactory.getServiceResourceResolver(param)) {
            for (ResourceChange change : changes) {
                String path = change.getPath();
                
                // Hum check karenge agar properties node (metadata) update ho raha hai
                if (path.contains("/jcr:content")) {
                    Resource resource = resolver.getResource(path);
                    
                    if (resource != null) {
                        ValueMap properties = resource.getValueMap();
                        
                        // Sirf tab aage badhe jab Off Time update hua ho
                        if (properties.containsKey(OFFTIME_PROPERTY)) {
                            Calendar offTimeCal = properties.get(OFFTIME_PROPERTY, Calendar.class);
                            
                            // 👉 YAHAN FIX KIYA HAI: Exact Parent Node (/jcr:content) se Last Modified By nikalna
                            String jcrContentPath = path.substring(0, path.indexOf("/jcr:content") + 12);
                            Resource jcrContentRes = resolver.getResource(jcrContentPath);
                            
                            String trueModifier = null;
                            
                            if (jcrContentRes != null) {
                                ValueMap jcrProps = jcrContentRes.getValueMap();
                                // Pehle cq:lastModifiedBy check karenge
                                trueModifier = jcrProps.get("cq:lastModifiedBy", String.class);
                                
                                // Agar cq:lastModifiedBy na mile, tab jcr:lastModifiedBy check karenge
                                if (trueModifier == null) {
                                    trueModifier = jcrProps.get("jcr:lastModifiedBy", String.class);
                                }
                            }
                            
                            // Ek aur fallback: Agar metadata par hi store ho gaya ho galti se
                            if (trueModifier == null) {
                                trueModifier = properties.get("cq:lastModifiedBy", String.class);
                            }
                            if (trueModifier == null) {
                                trueModifier = properties.get("jcr:lastModifiedBy", String.class);
                            }

                            if (trueModifier == null) {
                                trueModifier = "admin"; // Final safety net
                            }

                            if (offTimeCal != null) {
                                Date offTimeDate = offTimeCal.getTime();
                                
                                // Schedule tabhi karein jab time future ka ho
                                if (offTimeDate.after(new Date())) {
                                    String assetPath = jcrContentPath.replace("/jcr:content", "");
                                    scheduleDeactivationJob(assetPath, offTimeDate, trueModifier);
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            LOG.error("Error in AssetDeactivationListener", e);
        }
    }

    private void scheduleDeactivationJob(String assetPath, Date offTime, String initiatorId) {
        Map<String, Object> jobProps = new HashMap<>();
        jobProps.put("assetPath", assetPath);
        jobProps.put("initiatorId", initiatorId);

        JobBuilder builder = jobManager.createJob(JOB_TOPIC).properties(jobProps);
        builder.schedule().at(offTime).add();
        
        // Console me clear print hoga ki kis user ne schedule kiya hai
        LOG.info(">>> SUCCESS: Email Job Scheduled for asset {} by EXACT USER: {} <<<", assetPath, initiatorId);
    }
}