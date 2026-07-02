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
        Constants.SERVICE_DESCRIPTION + "=Check if User Mobile Exists",
        "sling.servlet.methods=" + HttpConstants.METHOD_POST,
        "sling.servlet.paths=" + "/bin/checkUser"
})
public class CheckUserServlet extends SlingAllMethodsServlet {

    private static final Logger log = LoggerFactory.getLogger(CheckUserServlet.class);

    @Reference
    private DataSourcePool dataSourcePool;

    @Override
    protected void doPost(SlingHttpServletRequest request, SlingHttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String mobile = request.getParameter("mobile");

        if (mobile == null || mobile.isEmpty()) {
            response.setStatus(400);
            response.getWriter().write("{\"status\":\"error\", \"message\":\"Missing mobile parameter\"}");
            return;
        }

        Connection connection = null;
        try {
            DataSource dataSource = (DataSource) dataSourcePool.getDataSource("my-postgres-ds");
            connection = dataSource.getConnection();

            // Sirf id check kar rahe hain jahan mobile number match ho
            String sql = "SELECT id FROM e_commerce_users WHERE mobile_number = ?";
            PreparedStatement pstmt = connection.prepareStatement(sql);
            pstmt.setString(1, mobile);

            ResultSet rs = pstmt.executeQuery();

            if (rs.next()) {
                // Number mil gaya
                response.setStatus(200);
                response.getWriter().write("{\"status\":\"exists\"}");
            } else {
                // Number nahi mila
                response.setStatus(404);
                response.getWriter().write("{\"status\":\"not_found\"}");
            }

        } catch (Exception e) {
            log.error("Database error during user check: ", e);
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