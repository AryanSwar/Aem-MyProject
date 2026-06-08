package com.myproject.core.config;

import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.AttributeType;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;

@ObjectClassDefinition(
    name = "Profile Default Image Configuration",
    description = "Stores the default image path for the Profile Card component."
)
public @interface DefaultImageConfig {

    @AttributeDefinition(
        name = "Default Image Path",
        description = "Path from DAM",
        type = AttributeType.STRING
    )
    String defaultImagePath() default "/content/dam/myproject/defaults/default-profile.jpg";
}