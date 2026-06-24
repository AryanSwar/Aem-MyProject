package com.myproject.core.workflows.routing;

import com.adobe.granite.workflow.WorkflowException;
import com.adobe.granite.workflow.WorkflowSession;
import com.adobe.granite.workflow.exec.WorkItem;
import com.adobe.granite.workflow.exec.WorkflowData;
import com.adobe.granite.workflow.exec.WorkflowProcess;
import com.adobe.granite.workflow.metadata.MetaDataMap;
import com.day.cq.wcm.api.Page;
import com.day.cq.wcm.api.PageManager;
import org.apache.sling.api.resource.ResourceResolver;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component(
    service = WorkflowProcess.class,
    property = { "process.label=Custom - Dynamic Page Router" }
)
public class DynamicWorkflowRouter implements WorkflowProcess {
    private static final Logger log = LoggerFactory.getLogger(DynamicWorkflowRouter.class);

    private static final String PRODUCT_TEMPLATE = "/conf/myproject/settings/wcm/templates/product-page";

    @Override
    public void execute(WorkItem workItem, WorkflowSession session, MetaDataMap args) throws WorkflowException {
        WorkflowData workflowData = workItem.getWorkflowData();
        if (!workflowData.getPayloadType().equals("JCR_PATH")) return;

        String payloadPath = workflowData.getPayload().toString();
        boolean isProductPage = false;

        try (ResourceResolver resolver = session.adaptTo(ResourceResolver.class)) {
            if (resolver != null) {
                PageManager pageManager = resolver.adaptTo(PageManager.class);
                Page page = pageManager.getPage(payloadPath);

                if (page != null) {
                    String templatePath = page.getProperties().get("cq:template", "");
                    if (templatePath.equalsIgnoreCase(PRODUCT_TEMPLATE) || payloadPath.contains("/products/")) {
                        isProductPage = true;
                    }
                }
            }
            
            // 100% BUG FIX: Put metadata inside 'workflowData' (Pocket B) so OR-Split script can read it!
            workflowData.getMetaDataMap().put("isProductPage", isProductPage);
            log.info("Dynamic Router evaluated path [{}]. isProductPage saved in WorkflowData = {}", payloadPath, isProductPage);

        } catch (Exception e) {
            log.error("Error in DynamicWorkflowRouter", e);
            throw new WorkflowException("Routing evaluation failed", e);
        }
    }
}