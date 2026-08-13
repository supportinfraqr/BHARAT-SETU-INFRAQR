document.addEventListener("DOMContentLoaded", function () {
    // All your chatbot logic here

    function connectToExpert() {
        const phoneNumber = "+919810167017"; // Replace with your number (without +)
        const message = $('#userMessage').val();
        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

        window.open(url, "_blank");
    }




    let typingInterval;


    


    function openChat() {
 
  
        document.getElementById('responseSection3').setAttribute('style', 'display: none !important');
        document.getElementById('inputSection').setAttribute('style', 'display: none !important'); 
       
        document.getElementById('chatContainer').style.display = 'block';

        const robotMessage = document.getElementById('robotMessage');
        const robotMessage1 = document.getElementById('robotMessage1');
        let dotCount = 0;

        typingInterval = setInterval(() => {
            dotCount = (dotCount + 1) % 4;
            let dots = '.'.repeat(dotCount);
            robotMessage1.innerHTML = `<span> ${dots}</span><img src="https://img.icons8.com/?size=100&id=WmDgmNrDhz7f&format=png&color=000000" alt="bot">`;
          }, 500);
        let greeting = getGreeting();
        robotMessage.innerHTML = `<span>${greeting} `+UserName+`, My name is EzIn. How may I assist you today? </span><img src="https://retail.ezcompliance.in/Content/img/favicon.png" alt="bot">`;
        setTimeout(() => {
            clearInterval(typingInterval); 
            robotMessage1.innerHTML = `<span>Kindly explain your issue in detail and attach a screenshot. This will help us resolve your concern more efficiently.</span><img src="https://retail.ezcompliance.in/Content/img/favicon.png" alt="bot">`;
           
            document.getElementById('inputSection').style.display = 'block';
        }, 2500);
    }
        
    //function sendMessage() {
    //    const message = document.getElementById('userMessage');
    //    const file = document.getElementById('userFile');
    //    let valid = true;

    //    message.classList.remove('error-border');
    //    file.parentElement.classList.remove('error-border');
    //    document.getElementById('messageError').style.display = 'none';
    //    document.getElementById('fileError').style.display = 'none';

    //    if (!message.value.trim()) {
    //        message.classList.add('error-border');
    //        document.getElementById('messageError').style.display = 'block';
    //        valid = false;
    //    }

    //    if (!file.files.length) {
    //        file.parentElement.classList.add('error-border');
    //        document.getElementById('fileError').style.display = 'block';
    //        valid = false;
    //    }

    //    if (!valid) return;

    //    SaveChatMessage
    //    document.getElementById('robotMessage').setAttribute('style', 'display: none !important');
    //    document.getElementById('robotMessage1').setAttribute('style', 'display: none !important');
    //    document.getElementById('inputSection').setAttribute('style', 'display: none !important');
      

    //    const responseSection = document.getElementById('responseSection');
    //    const responseSection1 = document.getElementById('responseSection1');
    //    const responseSection2 = document.getElementById('responseSection2');

    //    let dotCount = 0;
    //    responseSection.innerHTML = `<span>Thank you for reaching out. </span><img src="https://retail.ezcompliance.in/Content/img/favicon.png" alt="bot">`;
    //    document.getElementById('responseSection').style.display = 'block';


    //    typingInterval = setInterval(() => {
    //        dotCount = (dotCount + 1) % 4;
    //        let dots = '.'.repeat(dotCount);
    //        responseSection1.innerHTML = `<span> ${dots}</span><img src="https://img.icons8.com/?size=100&id=WmDgmNrDhz7f&format=png&color=000000" alt="bot">`;
    // }, 400);
   
        
    //    setTimeout(() => {
    //        clearInterval(typingInterval); 
    //        responseSection1.innerHTML = `<span>We're currently reviewing your query and will get back to you shortly.</span><img src="https://retail.ezcompliance.in/Content/img/favicon.png" alt="bot">`;
    //        document.getElementById('responseSection1').style.display = 'block';
    //        responseSection2.innerHTML = `<span>If the matter is urgent, please feel free to connect with one of our experts directly for immediate assistance.</span><img src="https://retail.ezcompliance.in/Content/img/favicon.png" alt="bot">`;
    //        document.getElementById('responseSection2').style.display = 'block'; 
    //        document.getElementById('responseSection3').setAttribute('style', 'display: block !important');

    //    }, 2500);
      

    //}
    var ticketno = "";
    function sendMessage() {
        const message = document.getElementById('userMessage');
        const file = document.getElementById('userFile');
        let valid = true;

        message.classList.remove('error-border');
        file.parentElement.classList.remove('error-border');
        document.getElementById('messageError').style.display = 'none';
        document.getElementById('fileError').style.display = 'none';

        if (!message.value.trim()) {
            message.classList.add('error-border');
            document.getElementById('messageError').style.display = 'block';
            valid = false;
        }

        if (!file.files.length) {
            file.parentElement.classList.add('error-border');
            document.getElementById('fileError').style.display = 'block';
            valid = false;
        }

        if (!valid) return;

        let formData = new FormData();
        formData.append("message", message.value.trim());
        formData.append("file", file.files[0]);
        formData.append("LoginId", LoginId);
        formData.append("Action",'1');

        $.ajax({
            url: '/Chat/SaveChatMessage',
            type: 'POST',
            data: formData,
            processData: false, // Don't process the files
            contentType: false, // Let jQuery set the content type
            success: function (data) {
                if (data.success) {
                    ticketno = data.data.Result; // no need to parse 
                    const el = document.getElementById('myController');
                    if (el) {
                        const scope = angular.element(el).scope();
                        if (scope && scope.$apply) {
                            scope.$apply(() => {
                                scope.FireEmail(24, 0, ticketno);
                            });
                        } else {
                            console.error("Angular scope not ready or $apply missing");
                        }
                    } else {
                        console.error("#myController not found");
                    }
                    console.log("Saved successfully", ticketno);
                    console.log("Saved successfully", data);
               

        // UI animations
                    document.getElementById('robotMessage').setAttribute('style', 'display: none !important');
                    document.getElementById('robotMessage1').setAttribute('style', 'display: none !important');
                    document.getElementById('inputSection').setAttribute('style', 'display: none !important');
 

        const responseSection = document.getElementById('responseSection');
        const responseSection1 = document.getElementById('responseSection1');
        const responseSection2 = document.getElementById('responseSection2');

        let dotCount = 0;
        responseSection.innerHTML = `<span>Thank you for reaching out. </span><img src="https://retail.ezcompliance.in/Content/img/favicon.png" alt="bot">`;
        responseSection.style.display = 'block';

        typingInterval = setInterval(() => {
            dotCount = (dotCount + 1) % 4;
            let dots = '.'.repeat(dotCount);
            responseSection1.innerHTML = `<span> ${dots}</span><img src="https://img.icons8.com/?size=100&id=WmDgmNrDhz7f&format=png&color=000000" alt="bot">`;
        }, 400);

        setTimeout(() => {
            clearInterval(typingInterval);
            responseSection1.innerHTML = `<span>We're currently reviewing your query and will get back to you shortly.</span><img src="https://retail.ezcompliance.in/Content/img/favicon.png" alt="bot">`;
            responseSection1.style.display = 'block';
            responseSection2.innerHTML = `<span>Your TicketNo is.` + ticketno +`. If the matter is urgent, please feel free to connect with one of our experts directly for immediate assistance.</span><img src="https://retail.ezcompliance.in/Content/img/favicon.png" alt="bot">`;
            responseSection2.style.display = 'block';
            document.getElementById('responseSection3').style.display = 'block';
        }, 2500);
                } else {
                    ticketno = "";
                    console.error("Server error:", data.error);
                }
            },
            error: function (xhr, status, error) {
                ticketno = "";
                console.error("AJAX error:", status, error);
            }
        });
    }
   
    function getGreeting() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Good Morning";
        if (hour >= 12 && hour < 17) return "Good Afternoon";
        if (hour >= 17 && hour < 21) return "Good Evening";
        return "Good Night";
    }

    function showFeedback() {
        document.getElementById('robotMessage').setAttribute('style', 'display: none !important');
        document.getElementById('robotMessage1').setAttribute('style', 'display: none !important');
        document.getElementById('responseSection').setAttribute('style', 'display: none !important');
        document.getElementById('responseSection1').setAttribute('style', 'display: none !important');
        document.getElementById('responseSection2').setAttribute('style', 'display: none !important');
        document.getElementById('responseSection3').setAttribute('style', 'display: none !important');
        document.getElementById('inputSection').setAttribute('style', 'display: none !important'); 
        document.getElementById('feedbackSection').style.display = 'block';  
    }
    var rat = 0;
    function rate(star) {
        document.querySelectorAll('.star').forEach(s => s.classList.remove('selected'));
        let stars = document.querySelectorAll('.star');
        rat = 0;
        for (let i = 0; i < stars.length; i++) {
            stars[i].classList.add('selected');
            rat += 1;
            if (stars[i] === star) break;
        }
      
    }

    //function closeChat() {
       

    //    const suggestion = document.getElementById('feedbackSuggestion');
    //    const feedbackError = document.getElementById('feedbackError');

    //    suggestion.classList.remove('error-border');
    //    feedbackError.style.display = 'none';

    //    if (!suggestion.value.trim()) {
    //        suggestion.classList.add('error-border');
    //        feedbackError.style.display = 'block';
    //        return;
    //    }

    //    alert("Thank you! Have a nice day ✨");
    //    document.getElementById('chatContainer').style.display = 'none';
    //}

   
    function closeChat() {
        const suggestion = document.getElementById('feedbackSuggestion');
        const feedbackError = document.getElementById('feedbackError');

        suggestion.classList.remove('error-border');
        feedbackError.style.display = 'none';

        if (!suggestion.value.trim()) {
            suggestion.classList.add('error-border');
            feedbackError.style.display = 'block';
            return;
        }


        let formData = new FormData();
        formData.append("TicketNo", ticketno);
        formData.append("suggestion", $('#feedbackSuggestion').val());
        formData.append("Rate", rat); 
        formData.append("Action", '2');
     

        $.ajax({
            url: '/Chat/updatechatbot',
            type: 'POST',
            data: formData,
            processData: false, // Don't process the files
            contentType: false, // Let jQuery set the content type
            success: function (data) {
                if (data.success) { 
                    console.log("Update successfully", ticketno); 
                }
            }
        });


        alert("Thank you! Have a nice day ✨");

        // Resetting all sections
        document.getElementById('chatContainer').style.display = 'none';

        // Clear all chat messages and inputs
        document.getElementById('robotMessage').innerHTML = '';
        document.getElementById('robotMessage1').innerHTML = '';
        document.getElementById('responseSection').innerHTML = '';
        document.getElementById('responseSection1').innerHTML = '';
        document.getElementById('responseSection2').innerHTML = ''; 
        document.getElementById('feedbackSuggestion').value = '';
        document.getElementById('userMessage').value = '';
        document.getElementById('userFile').value = '';
        document.getElementById('dropArea').querySelector('p').textContent = '📎 Drag & Drop or Click to Upload File';

        // Remove all selected stars
        document.querySelectorAll('.star').forEach(s => s.classList.remove('selected'));

        // Hide all sections except initial
        document.getElementById('robotMessage').style.display = 'none';
        document.getElementById('robotMessage1').style.display = 'none';
        document.getElementById('responseSection').style.display = 'none';
        document.getElementById('responseSection1').style.display = 'none';
        document.getElementById('responseSection2').style.display = 'none';
        document.getElementById('responseSection3').setAttribute('style', 'display: none !important');
        document.getElementById('inputSection').style.display = 'none';
        document.getElementById('feedbackSection').style.display = 'none';

        // Optional: Show intro or reset state if needed
    }


    // Drop area logic
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('userFile');

    dropArea.addEventListener('click', () => fileInput.click());
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('hover');
    });
    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('hover');
    });
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('hover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            dropArea.querySelector('p').textContent = `📄 File selected: ${e.dataTransfer.files[0].name}`;
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            dropArea.querySelector('p').textContent = `📄 File selected: ${fileInput.files[0].name}`;
        }
    });

    // Make `openChat` global so it's accessible from HTML
    window.openChat = openChat;
    window.sendMessage = sendMessage;
    window.showFeedback = showFeedback;
    window.rate = rate;
    window.closeChat = closeChat;
    window.connectToExpert = connectToExpert;
});


let isChatOpen = false;

function toggleChat() {
    const chatContainer = document.getElementById('chatContainer');
    const chatIconSymbol = document.getElementById('chatIconSymbol');

    isChatOpen = !isChatOpen;

    if (isChatOpen) {
        // Show chat and change icon to white cross
        chatContainer.style.display = 'block';
        chatIconSymbol.className = ''; // Remove font awesome classes
        chatIconSymbol.textContent = '✖'; // Set X symbol
        chatIconSymbol.style.color = '#ffffff';
        chatIconSymbol.style.fontSize = '28px';

        openChat(); // Existing function to trigger chatbot greeting
    } else {
        // Hide chat and revert to headset icon
        chatContainer.style.display = 'none';
        chatIconSymbol.className = 'fa-solid fa-headset fa-2xl';
        chatIconSymbol.textContent = '';
        chatIconSymbol.style.color = '#ffffff';
    }
}
