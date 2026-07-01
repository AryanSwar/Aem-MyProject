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
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

@Component(service = Servlet.class, property = {
        Constants.SERVICE_DESCRIPTION + "=Login User from PostgreSQL",
        "sling.servlet.methods=" + HttpConstants.METHOD_POST,
        "sling.servlet.paths=" + "/bin/loginUser"
})
public class LoginUserServlet extends SlingAllMethodsServlet {

    private static final Logger log = LoggerFactory.getLogger(LoginUserServlet.class);

    @Reference
    private DataSourcePool dataSourcePool;

    @Override
    protected void doPost(SlingHttpServletRequest request, SlingHttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String identifier = request.getParameter("identifier"); // Ye Email ya Mobile kuch bhi ho sakta hai
        String password = request.getParameter("password");

        if (identifier == null || password == null || identifier.isEmpty() || password.isEmpty()) {
            response.setStatus(400);
            response.getWriter().write("{\"status\":\"error\", \"message\":\"Missing credentials\"}");
            return;
        }

        Connection connection = null;
        try {
            DataSource dataSource = (DataSource) dataSourcePool.getDataSource("my-postgres-ds");
            connection = dataSource.getConnection();

            // SQL Query jo Email OR Mobile_number dono match karegi
            String sql = "SELECT id, first_name FROM e_commerce_users WHERE (email = ? OR mobile_number = ?) AND password = ?";
            PreparedStatement pstmt = connection.prepareStatement(sql);
            pstmt.setString(1, identifier);
            pstmt.setString(2, identifier);
            pstmt.setString(3, password);

            ResultSet rs = pstmt.executeQuery();

            if (rs.next()) {
                // Agar record mil gaya matlab user genuine hai
                response.setStatus(200);
                response.getWriter().write("{\"status\":\"success\", \"message\":\"User logged in successfully\"}");
            } else {
                // Koi record nahi mila matlab galat email/mobile ya password hai
                response.setStatus(401);
                response.getWriter().write("{\"status\":\"error\", \"message\":\"Invalid Credentials\"}");
            }

        } catch (Exception e) {
            log.error("Database error during login: ", e);
            response.setStatus(500);
            response.getWriter().write("{\"status\":\"error\", \"message\":\"Database error\"}");
        } finally {
            if (connection != null) {
                try {
                    connection.close();
                } catch (Exception e) {
                    log.error("Error closing connection: ", e);
                }
            }
        }
    }
}