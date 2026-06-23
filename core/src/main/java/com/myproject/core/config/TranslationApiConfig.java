package com.myproject.core.config;

import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.AttributeType;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;

@ObjectClassDefinition(name = "AEM Custom Translation API Configuration")
public @interface TranslationApiConfig {

    @AttributeDefinition(name = "API Endpoint URL", type = AttributeType.STRING)
    String apiUrl() default "https://api.mymemory.translated.net/get";

    @AttributeDefinition(name = "API Key (Optional)", type = AttributeType.STRING)
    String apiKey() default "";
}