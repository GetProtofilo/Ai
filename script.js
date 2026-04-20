// PASTE YOUR GOOGLE GEMINI API KEY HERE
const GEMINI_API_KEY = 'AIzaSyAPnMHG7vCUlh9zv0ht75K__SSYVSLgI8g'; 

// DOM Elements
const micBtn = document.getElementById('micBtn');
const statusText = document.getElementById('status-text');
const chatContainer = document.getElementById('chat-container');

// Conversation History Array (gives the AI memory of the chat)
let conversationHistory = [
    {
        "role": "user",
        "parts": [{ "text": "System Instruction: You are a patient, encouraging English tutor chatting with my mother. Keep responses short (1-2 sentences). Correct her grammar gently if she makes a mistake, then continue the conversation naturally." }]
    },
    {
        "role": "model",
        "parts": [{ "text": "Understood. I am ready to help her practice English." }]
    }
];

// 1. Setup Speech Recognition (Browser's Ears)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
} else {
    statusText.innerText = "Speech recognition not supported in this browser. Try Chrome.";
    micBtn.disabled = true;
}

// 2. Setup Speech Synthesis (Browser's Voice)
const synth = window.speechSynthesis;

// Handle Microphone Click
micBtn.onclick = () => {
    if (!recognition) return;
    
    // Stop any AI voice currently speaking so she can talk
    if (synth.speaking) {
        synth.cancel(); 
    }

    recognition.start();
    micBtn.classList.add('listening');
    statusText.innerText = "Listening... Speak now.";
};

// Handle Voice Recognition Result
recognition.onresult = async (event) => {
    const userText = event.results[0][0].transcript;
    micBtn.classList.remove('listening');
    statusText.innerText = "Thinking...";
    
    // Add user message to UI
    appendMessage(userText, 'user');
    
    // Fetch AI response
    await fetchGeminiResponse(userText);
};

// Handle Recognition Error
recognition.onerror = (event) => {
    micBtn.classList.remove('listening');
    statusText.innerText = "Didn't catch that. Tap the mic to try again.";
};

// Communicate with Gemini API
async function fetchGeminiResponse(userText) {
    // Add user message to history
    conversationHistory.push({
        "role": "user",
        "parts": [{ "text": userText }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: conversationHistory
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        // Extract the AI text
        const aiText = data.candidates[0].content.parts[0].text;
        
        // Add AI response to history so it remembers for next time
        conversationHistory.push({
            "role": "model",
            "parts": [{ "text": aiText }]
        });
        
        // Add AI message to UI
        appendMessage(aiText, 'ai');
        
        // Speak the response
        speakResponse(aiText);

    } catch (error) {
        console.error("API Error:", error);
        const errorMessage = "Sorry, my brain is having trouble connecting to the internet. Let's try again.";
        appendMessage(errorMessage, 'ai');
        speakResponse(errorMessage);
        statusText.innerText = "Connection error. Tap mic to retry.";
    }
}

// Function to add a message bubble to the screen
function appendMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('bubble');
    bubbleDiv.innerText = text;
    
    messageDiv.appendChild(bubbleDiv);
    chatContainer.appendChild(messageDiv);
    
    // Auto-scroll to the bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Function to read text out loud
function speakResponse(text) {
    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.rate = 0.9; // Slower, clearer speech
    utterThis.lang = 'en-US';
    
    utterThis.onend = () => {
        statusText.innerText = "Tap the microphone to reply";
    };
    
    synth.speak(utterThis);
}
