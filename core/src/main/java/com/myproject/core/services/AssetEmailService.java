package com.myproject.core.services;

import java.util.Map;

public interface AssetEmailService {
    void sendEmail(String templatePath, Map<String, String> emailParams, String recipientEmail);
}