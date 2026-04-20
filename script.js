const GEMINI_API_KEY = 'AIzaSyBk2sXeRplSbZz_NNhfd9fxnYA7ZlgpJhk'; 

const micBtn = document.getElementById('micBtn');
const statusText = document.getElementById('status-text');
const chatContainer = document.getElementById('chat-container');

let conversationHistory = [
    { "role": "user", "parts": [{ "text": "You are a patient English tutor. Keep responses very short (1-2 sentences). Speak naturally. If I make a grammar mistake, gently correct me." }] }
];

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
const synth = window.speechSynthesis;

// SETTINGS FOR CONTINUOUS TALK
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.continuous = false; // We manual-restart for better accuracy

let isAutoListening = false;

micBtn.onclick = () => {
    if (isAutoListening) {
        stopEverything();
    } else {
        startListening();
        isAutoListening = true;
    }
};

function startListening() {
    try {
        recognition.start();
        micBtn.classList.add('listening');
        statusText.innerText = "I'm listening... Speak naturally.";
    } catch (e) { console.log("Already listening"); }
}

function stopEverything() {
    recognition.stop();
    synth.cancel();
    isAutoListening = false;
    micBtn.classList.remove('listening');
    statusText.innerText = "Conversation stopped. Tap to start.";
}

recognition.onresult = async (event) => {
    const userText = event.results[0][0].transcript;
    statusText.innerText = "Thinking...";
    appendMessage(userText, 'user');
    
    await fetchGeminiResponse(userText);
};

// If the mic stops because of silence, and we are in "Auto Mode", restart it AFTER AI speaks
recognition.onend = () => {
    if (isAutoListening && !synth.speaking) {
        // This keeps the loop going if Gemini is still thinking
    }
};

async function fetchGeminiResponse(userText) {
    conversationHistory.push({ "role": "user", "parts": [{ "text": userText }] });

    // Use the 1.5-Flash model - it's the most stable for free tier
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: conversationHistory })
        });

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        
        conversationHistory.push({ "role": "model", "parts": [{ "text": aiText }] });
        appendMessage(aiText, 'ai');
        speakResponse(aiText);

    } catch (error) {
        console.error(error);
        // If it fails, we try to restart the mic so she can try again
        statusText.innerText = "Connection blip. Try again!";
        if (isAutoListening) setTimeout(startListening, 1000);
    }
}

function speakResponse(text) {
    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.rate = 1.0; 
    
    utterThis.onstart = () => {
        statusText.innerText = "AI is speaking...";
    };

    utterThis.onend = () => {
        if (isAutoListening) {
            // THE SECRET SAUCE: Wait 500ms after speaking, then start listening again automatically
            setTimeout(startListening, 500);
        } else {
            statusText.innerText = "Tap to talk";
        }
    };
    
    synth.speak(utterThis);
}

function appendMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('bubble');
    bubbleDiv.innerText = text;
    messageDiv.appendChild(bubbleDiv);
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
