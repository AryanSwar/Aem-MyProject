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

@Component(service = Servlet.class, property = {
        Constants.SERVICE_DESCRIPTION + "=Reset User Password",
        "sling.servlet.methods=" + HttpConstants.METHOD_POST,
        "sling.servlet.paths=" + "/bin/resetPassword"
})
public class ResetPasswordServlet extends SlingAllMethodsServlet {

    private static final Logger log = LoggerFactory.getLogger(ResetPasswordServlet.class);

    @Reference
    private DataSourcePool dataSourcePool;

    @Override
    protected void doPost(SlingHttpServletRequest request, SlingHttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String mobile = request.getParameter("mobile");
        String newPassword = request.getParameter("newPassword");

        if (mobile == null || newPassword == null || mobile.isEmpty() || newPassword.isEmpty()) {
            response.setStatus(400);
            response.getWriter().write("{\"status\":\"error\", \"message\":\"Missing parameters\"}");
            return;
        }

        Connection connection = null;
        try {
            DataSource dataSource = (DataSource) dataSourcePool.getDataSource("my-postgres-ds");
            connection = dataSource.getConnection();

            // 🌟 BCrypt: Hash the NEW password before saving to DB
            String hashedNewPassword = BCrypt.hashpw(newPassword, BCrypt.gensalt(12));

            String sql = "UPDATE e_commerce_users SET password = ? WHERE mobile_number = ?";
            PreparedStatement pstmt = connection.prepareStatement(sql);
            
            // 🌟 Set the newly Hashed Password
            pstmt.setString(1, hashedNewPassword); 
            pstmt.setString(2, mobile);

            int rowsAffected = pstmt.executeUpdate();

            if (rowsAffected > 0) {
                response.setStatus(200);
                response.getWriter().write("{\"status\":\"success\"}");
            } else {
                response.setStatus(404);
                response.getWriter().write("{\"status\":\"error\", \"message\":\"User not found\"}");
            }

        } catch (Exception e) {
            log.error("Database error during password reset: ", e);
            response.setStatus(500);
            response.getWriter().write("{\"status\":\"error\"}");
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