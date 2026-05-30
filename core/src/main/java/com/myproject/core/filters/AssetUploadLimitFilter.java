package com.myproject.core.filters;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.resource.Resource;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import java.io.IOException;

@Component(
    service = Filter.class,
    property = {
        // ISSUE 1 SOLVED: Regex updated to (/.*)? 
        "sling.filter.pattern=/content/dam/myproject/restricted-assets(/.*)?",
        "sling.filter.scope=REQUEST",
        "sling.filter.methods=POST",
        "service.ranking:Integer=-700"
    }
)
public class AssetUploadLimitFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(AssetUploadLimitFilter.class);
    private static final int MAX_ASSETS = 5;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        SlingHttpServletRequest slingRequest = (SlingHttpServletRequest) request;
        SlingHttpServletResponse slingResponse = (SlingHttpServletResponse) response;

        // ISSUE 2 SOLVED: Check if request is an actual File Upload (Multipart)
        // Agar request multipart nahi hai, iska matlab naya folder ban raha hai ya metadata save ho raha hai.
        String contentType = slingRequest.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("multipart/form-data")) {
            // Folder creation ko pass hone do, aage roko mat
            chain.doFilter(request, response);
            return;
        }

        Resource targetResource = slingRequest.getResource();

        // Check if resource is not a folder
        if (targetResource != null && !targetResource.isResourceType("sling:Folder") &&
            !targetResource.isResourceType("sling:OrderedFolder")) {
            targetResource = targetResource.getParent();
        }

        if (targetResource != null) {
            int assetCount = 0;
            
            // Count only dam:Asset children
            for (Resource child : targetResource.getChildren()) {
                if ("dam:Asset".equals(child.getResourceType())) {
                    assetCount++;
                }
            }

            // Restrict if 5 or more assets exist
            if (assetCount >= MAX_ASSETS) {
                log.warn("Upload restricted! Folder {} already has {} assets.", targetResource.getPath(), MAX_ASSETS);
                
                slingResponse.sendError(SlingHttpServletResponse.SC_BAD_REQUEST, 
                        "Upload Failed: Maximum limit of 5 assets reached in this folder.");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {}

    @Override
    public void destroy() {}
}