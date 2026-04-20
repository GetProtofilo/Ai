const API_KEY = 'AIzaSyBk2sXeRplSbZz_NNhfd9fxnYA7ZlgpJhk'; // PASTE YOUR KEY HERE

const micBtn = document.getElementById('micBtn');
const statusText = document.getElementById('status-text');
const chatContainer = document.getElementById('chat-container');
const orb = document.getElementById('orb');

let history = [
    { role: "user", parts: [{ text: "System: You are a friendly English tutor. Keep responses very short and clear. If I make a grammar mistake, gently fix it." }] }
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
        document.body.classList.add('listening-active');
        startListening();
    } else {
        stopConversation();
    }
};

function startListening() {
    if (!isConversationActive) return;
    try {
        recognition.start();
        orb.style.background = "#4ade80";
        orb.style.boxShadow = "0 0 15px #4ade80";
        statusText.innerText = "I'm listening...";
    } catch (e) {}
}

function stopConversation() {
    isConversationActive = false;
    document.body.classList.remove('listening-active');
    recognition.stop();
    synth.cancel();
    statusText.innerText = "Session ended.";
    orb.style.background = "#94a3b8";
    orb.style.boxShadow = "none";
}

recognition.onresult = async (event) => {
    const text = event.results[0][0].transcript;
    appendMsg(text, 'user');
    statusText.innerText = "Thinking...";
    orb.style.background = "#f59e0b"; // Yellow for thinking
    
    await askGemini(text);
};

async function askGemini(text) {
    history.push({ role: "user", parts: [{ text: text }] });

    try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: history })
        });
        
        const data = await resp.json();
        const aiText = data.candidates[0].content.parts[0].text;
        
        history.push({ role: "model", parts: [{ text: aiText }] });
        appendMsg(aiText, 'ai');
        speak(aiText);
    } catch (err) {
        statusText.innerText = "Connection error.";
        setTimeout(startListening, 2000);
    }
}

function speak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1.0;
    
    speech.onstart = () => {
        orb.style.background = "#6366f1"; // Purple for speaking
        statusText.innerText = "AI is talking...";
    };

    speech.onend = () => {
        // CONTINUOUS LOOP: After speaking, go back to listening automatically
        if (isConversationActive) {
            setTimeout(startListening, 400);
        }
    };
    
    synth.speak(speech);
}

function appendMsg(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}-message`;
    div.innerHTML = `<div class="bubble">${text}</div>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
}
