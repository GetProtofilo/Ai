const API_KEY = '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'; 

const micBtn = document.getElementById('micBtn');
const statusText = document.getElementById('status-text');
const chatContainer = document.getElementById('chat-container');

// AI Memory - System prompt helps with the Hindi translation you wanted
let history = [
    { role: "system", content: "You are a patient English tutor. If the user speaks Hindi, translate it to English first, then respond. Keep responses under 2 sentences." }
];

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
const synth = window.speechSynthesis;

recognition.lang = 'en-US';
recognition.interimResults = false;
let isConversationActive = false;

micBtn.onclick = () => {
    if (!isConversationActive) {
        isConversationActive = true;
        // Visual feedback
        micBtn.style.background = "#ef4444"; 
        startListening();
    } else {
        stopConversation();
    }
};

function startListening() {
    if (!isConversationActive) return;
    try {
        recognition.start();
        statusText.innerText = "Listening... Speak now.";
    } catch (e) {
        console.log("Mic already open");
    }
}

function stopConversation() {
    isConversationActive = false;
    micBtn.style.background = "linear-gradient(135deg, #6366f1, #a855f7)";
    recognition.stop();
    synth.cancel();
    statusText.innerText = "Stopped.";
}

recognition.onresult = async (event) => {
    const text = event.results[0][0].transcript;
    appendMsg(text, 'user');
    statusText.innerText = "AI is thinking...";
    
    await askGroq(text);
};

// Handle cases where the mic closes automatically
recognition.onend = () => {
    if (isConversationActive && !synth.speaking) {
        // If it stopped but AI isn't talking, restart it
        // We add a tiny delay to prevent a "loop" error
        setTimeout(startListening, 300);
    }
};

async function askGroq(text) {
    history.push({ role: "user", content: text });

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: history,
                temperature: 0.7,
                max_tokens: 150
            })
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        const aiText = data.choices[0].message.content;
        
        history.push({ role: "assistant", content: aiText });
        appendMsg(aiText, 'ai');
        speak(aiText);

    } catch (err) {
        console.error("Connection Error:", err);
        statusText.innerText = "Connection lost. Reconnecting...";
        // Try to recover
        setTimeout(startListening, 2000);
    }
}

function speak(text) {
    // Stop listening while AI speaks to avoid "feedback"
    recognition.stop();
    
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 0.9;
    
    speech.onstart = () => {
        statusText.innerText = "AI is talking...";
    };

    speech.onend = () => {
        if (isConversationActive) {
            statusText.innerText = "Listening...";
            setTimeout(startListening, 200);
        }
    };
    
    synth.speak(speech);
}

function appendMsg(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}-message`;
    div.innerHTML = `<div class="bubble">${text}</div>`;
    chatContainer.appendChild(div);
    // Smooth scroll to latest message
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
}
