package com.myproject.core.filters;

import org.apache.commons.lang3.StringUtils;
import org.apache.jackrabbit.api.security.user.Authorizable;
import org.apache.jackrabbit.api.security.user.Group;
import org.apache.jackrabbit.api.security.user.UserManager;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.engine.EngineConstants;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.Designate;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import java.io.IOException;
import java.util.Iterator;

@Component(
    service = Filter.class,
    property = {
        EngineConstants.SLING_FILTER_SCOPE + "=" + EngineConstants.FILTER_SCOPE_REQUEST
    }
)
@Designate(ocd = RestrictedFolderAccessFilter.Config.class) // Link Config to this component
public class RestrictedFolderAccessFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RestrictedFolderAccessFilter.class);

    // Variables that will hold the dynamic OSGi config values
    private String targetBasePath;
    private String allowedUploadPath;
    private String restrictedGroupId;

    // 1. Define the OSGi Configuration Interface
    @ObjectClassDefinition(name = "Restricted Folder Access Filter Configuration", 
                           description = "Configure paths and group ID for restricted folder access")
    public @interface Config {

        @AttributeDefinition(name = "Target Base Path", description = "Base path that should be restricted (e.g., /content/dam/myproject/ow)")
        String targetBasePath() default "/content/dam/myproject/ow";

        @AttributeDefinition(name = "Allowed Upload Path", description = "Path where uploads are allowed (e.g., /content/dam/myproject/ow/upload)")
        String allowedUploadPath() default "/content/dam/myproject/ow/upload";

        @AttributeDefinition(name = "Restricted Group ID", description = "Group ID that has restricted access")
        String restrictedGroupId() default "ow-uploads-users";
    }

    // 2. Read values when component starts or is modified
    @Activate
    @Modified
    protected void activate(Config config) {
        this.targetBasePath = config.targetBasePath();
        this.allowedUploadPath = config.allowedUploadPath();
        this.restrictedGroupId = config.restrictedGroupId();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        SlingHttpServletRequest slingRequest = (SlingHttpServletRequest) request;
        SlingHttpServletResponse slingResponse = (SlingHttpServletResponse) response;

        String requestUri = slingRequest.getRequestURI();
        
        if (requestUri.contains("assets.html") || requestUri.contains("dam/gui/content/assets")) {
            
            String suffix = slingRequest.getRequestPathInfo().getSuffix();

            // Using the dynamic variables instead of hardcoded strings
            if (StringUtils.isNotBlank(suffix) && 
                suffix.startsWith(targetBasePath) && 
                !suffix.startsWith(allowedUploadPath) &&
                !suffix.equals(targetBasePath)) { 
                
                try {
                    UserManager userManager = slingRequest.getResourceResolver().adaptTo(UserManager.class);
                    if (userManager != null) {
                        Authorizable currentUser = userManager.getAuthorizable(slingRequest.getResourceResolver().getUserID());
                        
                        // Using the dynamic group ID
                        if (isUserInGroup(currentUser, restrictedGroupId)) {
                            
                            slingResponse.setStatus(SlingHttpServletResponse.SC_FORBIDDEN);
                            slingResponse.setHeader("X-DAM-Access-Denied", "true");
                            
                            slingResponse.setContentType("text/html;charset=UTF-8");
                            slingResponse.getWriter().write(
                                "<!DOCTYPE html><html><head><title>Access Denied</title>" +
                                "<style>body{font-family:sans-serif;background-color:#f5f5f5;padding:50px;text-align:center;}" +
                                ".box{background:#fff;padding:30px;border-left:4px solid #d7373f;max-width:500px;margin:0 auto;box-shadow:0 1px 3px rgba(0,0,0,0.1);}</style></head>" +
                                "<body><div class='box'><h2 style='color:#d7373f;margin-top:0;'>Access Denied</h2>" +
                                "<p>You do not have permission to access this folder. Please contact the DAM Admin.</p>" +
                                "<button onclick='window.history.back()' style='padding:8px 16px;cursor:pointer;'>Go Back</button></div></body></html>"
                            );
                            return; 
                        }
                    }
                } catch (RepositoryException e) {
                    log.error("Error evaluating user permissions", e);
                }
            }
        }

        chain.doFilter(request, response);
    }

    private boolean isUserInGroup(Authorizable user, String groupId) throws RepositoryException {
        if (user != null && !user.isGroup()) {
            Iterator<Group> groups = user.memberOf(); 
            while (groups.hasNext()) {
                if (groupId.equals(groups.next().getID())) {
                    return true;
                }
            }
        }
        return false;
    }

    @Override
    public void init(FilterConfig filterConfig) {}

    @Override
    public void destroy() {}
}