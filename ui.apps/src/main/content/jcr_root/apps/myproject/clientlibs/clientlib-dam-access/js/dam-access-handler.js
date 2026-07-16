(function(document, $) {
    "use strict";

    // Global AJAX Error listener
    $(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
        
        // Check for 403 status and the custom header set in your Java Filter
        if (jqXHR.status === 403 && jqXHR.getResponseHeader('X-DAM-Access-Denied') === 'true') {
            
            // Jira Ticket exactly matching message
            var alertTitle = "Access Denied";
            var alertMessage = "You do not have the rights to perform this action. Please reach out to DAM Admins for assistance.";
            
            // AEM Coral UI / Foundation UI ka use karke beautiful alert show karna
            var ui = $(window).adaptTo("foundation-ui");
            if (ui) {
                // Clear any default AEM "Fail to load data" notifications if they pop up
                ui.clearWait(); 
                
                // Show the custom alert
                ui.alert(alertTitle, alertMessage, "error");
            } else {
                // Fallback for generic javascript alert
                alert(alertTitle + "\n\n" + alertMessage);
            }
            
            // Default error handling ko rokne ke liye event stop karein (optional but helpful)
            event.stopImmediatePropagation();
        }
    });

})(document, jQuery);