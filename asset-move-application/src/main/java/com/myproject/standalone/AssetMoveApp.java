package com.myproject.standalone;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Properties;

public class AssetMoveApp {

    private static final Logger log = LogManager.getLogger(AssetMoveApp.class);
    // CSV File Path define kiya hai
    private static final String CSV_FILE_PATH = "logs/asset-movement-report.csv";

    public static void main(String[] args) {
        log.info("Starting Standalone Asset Classification Application...");
        
        // Step 1: Prepare CSV File and write Headers if it's a new file
        prepareCsvReport();

        Properties props = new Properties();
        InputStream input = null;

        try {
            String configFilePath = "application.properties"; 
            if (args.length > 0) {
                configFilePath = args[0];
            }

            log.info("Reading configuration from: {}", configFilePath);
            input = new FileInputStream(configFilePath);
            props.load(input);

            String aemHost = props.getProperty("aem.host");
            String authHeader = props.getProperty("aem.auth");
            String landingFolder = props.getProperty("folder.landing");
            String quarantineFolder = props.getProperty("folder.quarantine");
            
            String rulesString = props.getProperty("rules");
            String[] classificationRules = rulesString.split(",");

            String folderJsonStr = getAemData(aemHost + landingFolder + ".1.json", authHeader);
            
            if (folderJsonStr != null && !folderJsonStr.isEmpty()) {
                JSONObject folderData = new JSONObject(folderJsonStr);
                String[] nodeNames = JSONObject.getNames(folderData);
                
                if (nodeNames != null) {
                    for (int i = 0; i < nodeNames.length; i++) {
                        String assetName = nodeNames[i];
                        Object childNode = folderData.get(assetName);
                        
                        if (childNode instanceof JSONObject) {
                            JSONObject childJson = (JSONObject) childNode;
                            if (childJson.has("jcr:primaryType") && "dam:Asset".equals(childJson.getString("jcr:primaryType"))) {
                                String sourcePath = landingFolder + "/" + assetName;
                                routeAsset(sourcePath, assetName, aemHost, authHeader, classificationRules, quarantineFolder);
                            }
                        }
                    }
                }
            } else {
                log.info("Landing folder is empty or not reachable.");
            }

        } catch (java.io.FileNotFoundException e) {
            log.error("File not found at path: {}", (args.length > 0 ? args[0] : "application.properties"));
        } catch (Exception e) {
            log.error("System Error: ", e);
        } finally {
            if (input != null) {
                try { input.close(); } catch (Exception e) {}
            }
            log.info("Execution Finished. Check CSV report in logs folder.");
        }
    }

    private static void routeAsset(String sourcePath, String assetName, String aemHost, String authHeader, String[] rules, String quarantineFolder) {
        try {
            String metadataJsonStr = getAemData(aemHost + sourcePath + "/_jcr_content/metadata.json", authHeader);
            String itemNumber = null;

            if (metadataJsonStr != null) {
                JSONObject metadata = new JSONObject(metadataJsonStr);
                if (metadata.has("itemNumber")) {
                    itemNumber = metadata.getString("itemNumber");
                }
            }

            String destinationFolder = quarantineFolder; 
            
            if (itemNumber != null && !itemNumber.trim().isEmpty()) {
                for (int i = 0; i < rules.length; i++) {
                    String[] ruleParts = rules[i].split("=");
                    if (ruleParts.length == 2) {
                        String pattern = ruleParts[0];
                        String targetFolder = ruleParts[1];
                        
                        if (itemNumber.startsWith(pattern)) {
                            destinationFolder = targetFolder;
                            break; 
                        }
                    }
                }
            }

            String destinationPath = destinationFolder + "/" + assetName;

            String displayItemNumber = (itemNumber != null && !itemNumber.trim().isEmpty()) ? itemNumber : "BLANK";

            if (moveAsset(aemHost, sourcePath, destinationPath, authHeader)) {
                log.info("SUCCESS | Asset: '{}' | Item Number: '{}' | Moved To: '{}'", assetName, displayItemNumber, destinationFolder);
                // Write success to CSV
                writeToCsv(assetName, displayItemNumber, "SUCCESS", destinationFolder);
            } else {
                log.error("FAILURE | Could not move Asset: '{}'", assetName);
                // Write failure to CSV
                writeToCsv(assetName, displayItemNumber, "FAILED", sourcePath); // source path pe hi reh gaya
            }

        } catch (Exception e) {
            log.error("Error processing asset: " + assetName, e);
            writeToCsv(assetName, "ERROR", "FAILED", "System Error");
        }
    }

    // --- NAYA FUNCTION: CSV Setup Karne Ke Liye ---
    private static void prepareCsvReport() {
        try {
            File logDir = new File("logs");
            if (!logDir.exists()) {
                logDir.mkdirs();
            }
            File csvFile = new File(CSV_FILE_PATH);
            boolean isNewFile = !csvFile.exists();
            
            // Append mode = true
            PrintWriter out = new PrintWriter(new FileWriter(csvFile, true));
            if (isNewFile) {
                // Pehli baar run hone par column names likhega
                out.println("Timestamp,Asset Name,Item Number,Status,Destination Folder");
            }
            out.close();
        } catch (Exception e) {
            log.error("Failed to initialize CSV file.", e);
        }
    }

    // --- NAYA FUNCTION: CSV mein naya Data Add Karne Ke Liye ---
    private static void writeToCsv(String assetName, String itemNumber, String status, String destination) {
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
            String timestamp = sdf.format(new Date());

            // Append mode = true
            PrintWriter out = new PrintWriter(new FileWriter(CSV_FILE_PATH, true));
            
            // Core Java String concatenation for CSV format
            out.println(timestamp + "," + assetName + "," + itemNumber + "," + status + "," + destination);
            out.close();
        } catch (Exception e) {
            log.error("Failed to write record to CSV.", e);
        }
    }

    // Old HTTP GET helper
    private static String getAemData(String urlPath, String authHeader) throws Exception {
        URL url = new URL(urlPath);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Authorization", authHeader);

        if (conn.getResponseCode() == 200) {
            BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line);
            }
            br.close();
            return sb.toString();
        }
        return null;
    }

    // Old HTTP POST helper
    private static boolean moveAsset(String aemHost, String sourcePath, String destPath, String authHeader) throws Exception {
        URL url = new URL(aemHost + sourcePath);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Authorization", authHeader);
        conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        conn.setDoOutput(true);

        String payload = ":operation=move&:dest=" + URLEncoder.encode(destPath, "UTF-8");
        OutputStream os = conn.getOutputStream();
        os.write(payload.getBytes());
        os.flush();
        os.close();

        int responseCode = conn.getResponseCode();
        return (responseCode == 200 || responseCode == 201);
    }
}