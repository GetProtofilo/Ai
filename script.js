const API_KEY = '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'; // Use your Groq Key here

const micBtn = document.getElementById('micBtn');
const statusText = document.getElementById('status-text');
const chatContainer = document.getElementById('chat-container');
const orb = document.getElementById('orb');

let history = [
    { role: "system", content: "You are a patient English tutor. The user might speak Hindi; if they do, translate it to English first, then respond in English. Keep responses very short (1-2 sentences). Always be encouraging." }
];

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
const synth = window.speechSynthesis;

recognition.lang = 'en-US'; // It can still pick up Hindi sounds or Hinglish
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
        statusText.innerText = "I'm listening... Speak now.";
    } catch (e) {}
}

function stopConversation() {
    isConversationActive = false;
    document.body.classList.remove('listening-active');
    recognition.stop();
    synth.cancel();
    statusText.innerText = "Talk again soon!";
    orb.style.background = "#94a3b8";
}

recognition.onresult = async (event) => {
    const text = event.results[0][0].transcript;
    appendMsg(text, 'user');
    statusText.innerText = "AI is thinking...";
    orb.style.background = "#f59e0b"; 
    
    await askAI(text);
};

async function askAI(text) {
    history.push({ role: "user", content: text });

    try {
        // Groq API is lightning fast and works great for this
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.1-70b-versatile",
                messages: history,
                max_tokens: 100
            })
        });
        
        const data = await resp.json();
        const aiText = data.choices[0].message.content;
        
        history.push({ role: "assistant", content: aiText });
        appendMsg(aiText, 'ai');
        speak(aiText);
    } catch (err) {
        console.error(err);
        statusText.innerText = "Connection error. Reconnecting...";
        setTimeout(startListening, 1000);
    }
}

function speak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 0.9;
    
    speech.onstart = () => {
        orb.style.background = "#6366f1"; 
        statusText.innerText = "AI is talking...";
    };

    speech.onend = () => {
        if (isConversationActive) {
            setTimeout(startListening, 500); // Back to listening!
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
