package com.myproject.core.workflows;

import com.day.cq.dam.api.Asset;
import com.day.cq.workflow.WorkflowException;
import com.day.cq.workflow.WorkflowSession;
import com.day.cq.workflow.exec.WorkItem;
import com.day.cq.workflow.exec.WorkflowData;
import com.day.cq.workflow.exec.WorkflowProcess;
import com.day.cq.workflow.metadata.MetaDataMap;
import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.ModifiableValueMap;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ResourceResolverFactory;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.Session;
import java.util.Collections;
import java.util.Map;

@Component(
    service = WorkflowProcess.class,
    property = {
        "process.label=Custom DAM Asset Title Generator" // Ye naam Workflow dropdown mein dikhega
    }
)
public class AssetTitleGeneratorProcess implements WorkflowProcess {

    private static final Logger log = LoggerFactory.getLogger(AssetTitleGeneratorProcess.class);

    // 1. ResourceResolverFactory ko inject karein
    @Reference
    private ResourceResolverFactory resourceResolverFactory;

    @Override
    public void execute(WorkItem item, WorkflowSession session, MetaDataMap args) throws WorkflowException {
        WorkflowData workflowData = item.getWorkflowData();
        
        // Ensure payload is a JCR path
        if (workflowData.getPayloadType().equals("JCR_PATH")) {
            String payloadPath = workflowData.getPayload().toString();
            log.info("Executing Asset Title Generator for: {}", payloadPath);

            ResourceResolver resolver = null;
            
            try {
                // 2. Sahi tarika ResourceResolver nikalne ka WorkflowSession se
                Session jcrSession = session.getSession();
                Map<String, Object> authInfo = Collections.singletonMap("user.jcr.session", jcrSession);
                resolver = resourceResolverFactory.getResourceResolver(authInfo);
                
                if (resolver != null) {
                    Resource assetResource = resolver.getResource(payloadPath);
                    if (assetResource != null) {
                        // Resource ko DAM Asset mein adapt karna
                        Asset asset = assetResource.adaptTo(Asset.class);
                        if (asset != null) {
                            processAndSaveTitle(asset, resolver);
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Error processing asset title for: {}", payloadPath, e);
            } finally {
                // Hamesha yaad rakhein ki custom getResourceResolver ko close karna achhi practice hai,
                // lekin kyunki ye workflow session se juda hai, hum isse intentionally close nahi karte 
                // warna workflow fail ho sakta hai.
            }
        }
    }

    private void processAndSaveTitle(Asset asset, ResourceResolver resolver) throws Exception {
        String filename = asset.getName(); // e.g., summer-sale_banner-2025.jpg

        // 1. Extension remove karna
        String nameWithoutExt = filename.contains(".") ? filename.substring(0, filename.lastIndexOf('.')) : filename;

        // 2. Hyphen (-) aur Underscore (_) ke basis par split karna
        String[] words = nameWithoutExt.split("[-_]");
        StringBuilder titleBuilder = new StringBuilder();

        // 3. Har word ka pehla letter Capital karna
        for (String word : words) {
            if (StringUtils.isNotBlank(word)) {
                titleBuilder.append(StringUtils.capitalize(word.toLowerCase())).append(" ");
            }
        }
        
        String cleanTitle = titleBuilder.toString().trim(); // e.g., "Summer Sale Banner 2025"

        // 4. Metadata Node ka path banana
        String metadataPath = asset.getPath() + "/jcr:content/metadata";
        Resource metadataResource = resolver.getResource(metadataPath);

        if (metadataResource != null) {
            // ModifiableValueMap for writing data
            ModifiableValueMap properties = metadataResource.adaptTo(ModifiableValueMap.class);
            
            if (properties != null) {
                // dc:title save karna
                properties.put("dc:title", cleanTitle);
                
                // CRXDE mein changes save karna
                resolver.commit();
                log.info("Successfully saved title '{}' for asset {}", cleanTitle, asset.getPath());
            } else {
                log.error("Could not adapt metadata resource to ModifiableValueMap.");
            }
        } else {
            log.error("Metadata resource not found at path: {}", metadataPath);
        }
    }
}