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

@Component(service = Servlet.class, property = {
        Constants.SERVICE_DESCRIPTION + "=Register User to PostgreSQL",
        "sling.servlet.methods=" + HttpConstants.METHOD_POST,
        "sling.servlet.paths=" + "/bin/registerUser"
})
public class RegisterUserServlet extends SlingAllMethodsServlet {

    private static final Logger log = LoggerFactory.getLogger(RegisterUserServlet.class);

    @Reference
    private DataSourcePool dataSourcePool;

    @Override
    protected void doPost(SlingHttpServletRequest request, SlingHttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String firstName = request.getParameter("firstName");
        String middleName = request.getParameter("middleName");
        String lastName = request.getParameter("lastName");
        String email = request.getParameter("email");
        String dob = request.getParameter("dob");
        String password = request.getParameter("password"); 
        String mobileNumber = request.getParameter("mobileNumber"); // 🌟 Fetch mobile number

        if (firstName == null || lastName == null || email == null || password == null || mobileNumber == null) {
            response.setStatus(400);
            response.getWriter().write("{\"status\":\"error\", \"message\":\"Missing mandatory fields\"}");
            return;
        }

        Connection connection = null;
        try {
            DataSource dataSource = (DataSource) dataSourcePool.getDataSource("my-postgres-ds");
            connection = dataSource.getConnection();

            // 🌟 UPDATE: Added mobile_number to the SQL query
            String sql = "INSERT INTO e_commerce_users (first_name, middle_name, last_name, email, dob, password, mobile_number) VALUES (?, ?, ?, ?, ?, ?, ?)";
            PreparedStatement pstmt = connection.prepareStatement(sql);
            pstmt.setString(1, firstName);
            pstmt.setString(2, middleName);
            pstmt.setString(3, lastName);
            pstmt.setString(4, email);
            
            if (dob != null && !dob.isEmpty()) {
                pstmt.setDate(5, java.sql.Date.valueOf(dob)); 
            } else {
                pstmt.setNull(5, java.sql.Types.DATE);
            }
            
            pstmt.setString(6, password);
            pstmt.setString(7, mobileNumber); // 🌟 Set mobile parameter

            int rowsAffected = pstmt.executeUpdate();

            if (rowsAffected > 0) {
                response.setStatus(200);
                response.getWriter().write("{\"status\":\"success\", \"message\":\"User registered successfully\"}");
            } else {
                response.setStatus(500);
                response.getWriter().write("{\"status\":\"error\", \"message\":\"Failed to register user\"}");
            }

        } catch (Exception e) {
            log.error("Database error during registration: ", e);
            response.setStatus(500);
            response.getWriter().write("{\"status\":\"error\", \"message\":\"" + e.getMessage() + "\"}");
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