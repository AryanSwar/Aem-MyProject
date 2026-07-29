package com.myproject.core.services;

public interface AssetNotificationService {
    void sendDeactivationEmail(String assetPath, String initiatorId);
}