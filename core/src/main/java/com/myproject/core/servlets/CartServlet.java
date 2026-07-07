package com.myproject.core.servlets;

import com.day.commons.datasource.poolservice.DataSourcePool;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.servlets.HttpConstants;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.framework.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.Servlet;
import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
// JSON processing
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonArray;

@Component(service = Servlet.class, property = {
        Constants.SERVICE_DESCRIPTION + "=Fetch and Save User Cart Data",
        "sling.servlet.methods=" + HttpConstants.METHOD_GET,
        "sling.servlet.methods=" + HttpConstants.METHOD_POST,
        "sling.servlet.paths=/bin/userCart"
})
public class CartServlet extends SlingAllMethodsServlet {

    private static final Logger log = LoggerFactory.getLogger(CartServlet.class);

    @Reference
    private DataSourcePool dataSourcePool;

    // Fetch Cart
    @Override
    protected void doGet(SlingHttpServletRequest request, SlingHttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String mobile = request.getParameter("mobile");

        if (mobile == null || mobile.isEmpty()) {
            response.setStatus(400);
            response.getWriter().write("{\"status\":\"error\", \"message\":\"Missing mobile parameter\"}");
            return;
        }

        try (Connection connection = ((DataSource) dataSourcePool.getDataSource("my-postgres-ds")).getConnection()) {
            String sql = "SELECT cart_data FROM user_carts WHERE mobile_number = ?";
            try (PreparedStatement pstmt = connection.prepareStatement(sql)) {
                pstmt.setString(1, mobile);
                try (ResultSet rs = pstmt.executeQuery()) {
                    if (rs.next()) {
                        String cartDataStr = rs.getString("cart_data");
                        // Safety check: Agar null ho toh empty array dein
                        if (cartDataStr == null || cartDataStr.trim().isEmpty()) {
                            cartDataStr = "[]";
                        }
                        response.getWriter().write("{\"status\":\"success\", \"cartData\":" + cartDataStr + "}");
                    } else {
                            // Empty array for new users
                        response.getWriter().write("{\"status\":\"success\", \"cartData\":[]}");
                    }
                }
            }
        } catch (Exception e) {
            log.error("Database error during cart fetch: ", e);
            response.setStatus(500);
            response.getWriter().write("{\"status\":\"error\"}");
        }
    }
    // Save/Update Cart
    @Override
    protected void doPost(SlingHttpServletRequest request, SlingHttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = request.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
        }

        try {
            JsonObject jsonObject = JsonParser.parseString(sb.toString()).getAsJsonObject();
            String mobile = jsonObject.get("mobile").getAsString();
            JsonArray cartData = jsonObject.getAsJsonArray("cartData");

            try (Connection connection = ((DataSource) dataSourcePool.getDataSource("my-postgres-ds")).getConnection()) {
                // Upsert Query: Agar data exist karta hai toh update, nahi toh insert
                String sql = "INSERT INTO user_carts (mobile_number, cart_data) VALUES (?, ?::jsonb) " +
                             "ON CONFLICT (mobile_number) DO UPDATE SET cart_data = EXCLUDED.cart_data, updated_at = CURRENT_TIMESTAMP";
                
                try (PreparedStatement pstmt = connection.prepareStatement(sql)) {
                    pstmt.setString(1, mobile);
                    pstmt.setString(2, cartData.toString());
                    pstmt.executeUpdate();
                    
                    response.getWriter().write("{\"status\":\"success\"}");
                }
            }
        } catch (Exception e) {
            log.error("Database error during cart update: ", e);
            response.setStatus(500);
            response.getWriter().write("{\"status\":\"error\"}");
        }
    }
}