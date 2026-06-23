package com.myproject.core.servlets;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.servlets.SlingSafeMethodsServlet;
import org.osgi.framework.Constants;
import org.osgi.service.component.annotations.Component;

import javax.servlet.Servlet;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;

@Component(
    service = { Servlet.class },
    property = {
        Constants.SERVICE_DESCRIPTION + "=Simple AEM Translation Proxy Servlet",
        "sling.servlet.paths=/bin/custom/translate", // <-- YE AAPKA AEM ENDPOINT HAI
        "sling.servlet.methods=GET"
    }
)
public class TranslationServlet extends SlingSafeMethodsServlet {

    @Override
    protected void doGet(SlingHttpServletRequest request, SlingHttpServletResponse response) {
        try {
            // Frontend se do cheezein lenge: Text aur Target Language (jaise 'hi' for Hindi)
            String text = request.getParameter("text");
            String targetLang = request.getParameter("lang"); 

            if (text == null || targetLang == null) {
                response.getWriter().write("{\"error\": \"Text or Language parameter missing\"}");
                return;
            }

            // Text ko URL format me convert karenge (e.g. "hello world" -> "hello%20world")
            String encodedText = URLEncoder.encode(text, "UTF-8");
            
            // 3rd Party API ka URL (English to Target Language)
            String apiUrl = "https://api.mymemory.translated.net/get?q=" + encodedText + "&langpair=en|" + targetLang;

            URL url = new URL(apiUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");

            BufferedReader in = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            String inputLine;
            StringBuilder apiResponse = new StringBuilder();

            while ((inputLine = in.readLine()) != null) {
                apiResponse.append(inputLine);
            }
            in.close();

            // AEM ke Servlet se JSON Browser ko bhej diya
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(apiResponse.toString());

        } catch (Exception e) {
            response.setStatus(SlingHttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }
}