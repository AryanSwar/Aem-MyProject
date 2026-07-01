package com.myproject.core.servlets;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.servlets.HttpConstants;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.osgi.service.component.annotations.Component;
import org.osgi.framework.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.Servlet;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

@Component(service = Servlet.class, property = {
        Constants.SERVICE_DESCRIPTION + "=Generate and Verify OTP",
        "sling.servlet.methods=" + HttpConstants.METHOD_POST,
        "sling.servlet.paths=" + "/bin/otpHandler"
})
public class OtpServlet extends SlingAllMethodsServlet {

    private static final Logger log = LoggerFactory.getLogger(OtpServlet.class);
    
    // Memory based storage for OTPs. Production mein ise DB ya Redis mein save karte hain.
    private static final ConcurrentHashMap<String, String> otpStorage = new ConcurrentHashMap<>();

    @Override
    protected void doPost(SlingHttpServletRequest request, SlingHttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String action = request.getParameter("action");
        String mobile = request.getParameter("mobile");

        if (mobile == null || mobile.isEmpty() || action == null) {
            response.setStatus(400);
            response.getWriter().write("{\"status\":\"error\", \"message\":\"Missing parameters\"}");
            return;
        }

        try {
            if ("generate".equals(action)) {
                // Generate a random 6-digit number
                int randomNum = (int) (Math.random() * 900000) + 100000;
                String generatedOtp = String.valueOf(randomNum);
                
                // Store in memory
                otpStorage.put(mobile, generatedOtp);
                log.info("OTP generated for mobile {}: {}", mobile, generatedOtp);
                
                // Testing ke liye response mein OTP bhej rahe hain taaki alert mein dikh sake
                response.setStatus(200);
                response.getWriter().write("{\"status\":\"success\", \"otp\":\"" + generatedOtp + "\"}");

            } else if ("verify".equals(action)) {
                String providedOtp = request.getParameter("otp");
                String storedOtp = otpStorage.get(mobile);
                
                if (storedOtp != null && storedOtp.equals(providedOtp)) {
                    // Match successful, remove from cache for security
                    otpStorage.remove(mobile);
                    response.setStatus(200);
                    response.getWriter().write("{\"status\":\"success\", \"message\":\"Verified\"}");
                } else {
                    // Match failed
                    response.setStatus(401);
                    response.getWriter().write("{\"status\":\"error\", \"message\":\"Invalid OTP\"}");
                }
            } else {
                response.setStatus(400);
                response.getWriter().write("{\"status\":\"error\", \"message\":\"Invalid action\"}");
            }
        } catch (Exception e) {
            log.error("Error handling OTP: ", e);
            response.setStatus(500);
            response.getWriter().write("{\"status\":\"error\", \"message\":\"Server error\"}");
        }
    }
}