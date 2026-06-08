package com.myproject.core.services.impl;

import com.myproject.core.config.DefaultImageConfig;
import com.myproject.core.services.ProfileFallbackService;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.metatype.annotations.Designate;

@Component(service = ProfileFallbackService.class, immediate = true)
@Designate(ocd = DefaultImageConfig.class)
public class ProfileFallbackServiceImpl implements ProfileFallbackService {

    private String defaultImagePath;

    @Activate
    @Modified
    protected void activate(DefaultImageConfig config) {
        this.defaultImagePath = config.defaultImagePath();
    }

    @Override
    public String getFinalImagePath(String authoredImagePath) {
        // Core logic: Check if authored path is null or empty
        if (authoredImagePath == null || authoredImagePath.trim().isEmpty()) {
            return defaultImagePath;
        }
        return authoredImagePath;
    }
}