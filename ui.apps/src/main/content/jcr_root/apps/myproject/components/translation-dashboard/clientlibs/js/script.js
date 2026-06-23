document.addEventListener('DOMContentLoaded', function() {
    var translateBtn = document.getElementById('translateBtn');
    if (translateBtn) {
        translateBtn.addEventListener('click', function() {
            var text = document.getElementById("sourceText").value;
            var lang = document.getElementById("targetLang").value;
            var resultBox = document.getElementById("resultBox");
            var outputText = document.getElementById("outputText");

            if (!text) { alert("Please enter text!"); return; }

            resultBox.style.display = "block";
            outputText.innerText = "Processing via OSGi Servlet... ⏳";

            fetch('/bin/custom/translate?text=' + encodeURIComponent(text) + '&lang=' + lang)
                .then(response => response.json())
                .then(data => {
                    if (data.responseData && data.responseData.translatedText) {
                        outputText.innerText = data.responseData.translatedText;
                    } else {
                        outputText.innerText = "Error in translation.";
                    }
                })
                .catch(error => { outputText.innerText = "AEM Servlet not reachable."; });
        });
    }
});