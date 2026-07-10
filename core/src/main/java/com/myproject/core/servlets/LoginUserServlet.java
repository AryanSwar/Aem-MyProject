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
// 🌟 BCrypt Import Added
import org.mindrot.jbcrypt.BCrypt; 

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

        String identifier = request.getParameter("identifier"); 
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

            // 🌟 UPDATE: Removed "AND password = ?" from SQL. We now fetch the hash to verify it in Java.
            String sql = "SELECT id, first_name, password FROM e_commerce_users WHERE mobile_number = ?";
            PreparedStatement pstmt = connection.prepareStatement(sql);
            pstmt.setString(1, identifier);
            // pstmt.setString(2, identifier);

            ResultSet rs = pstmt.executeQuery();

            if (rs.next()) {
                // 🌟 Fetch the stored Hash from Database
                String storedHashedPassword = rs.getString("password");
                
                // 🌟 BCrypt Check: Compares plain password with stored Hash (Extracts salt automatically)
                if (BCrypt.checkpw(password, storedHashedPassword)) {
                    response.setStatus(200);
                    response.getWriter().write("{\"status\":\"success\", \"message\":\"User logged in successfully\"}");
                } else {
                    response.setStatus(401);
                    response.getWriter().write("{\"status\":\"error\", \"message\":\"Invalid Credentials\"}");
                }
            } else {
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