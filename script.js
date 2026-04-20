// 1. USE YOUR GROQ KEY HERE
const API_KEY = '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'; 

const micBtn = document.getElementById('micBtn');
const statusText = document.getElementById('status-text');
const chatContainer = document.getElementById('chat-container');

let history = [
    { role: "system", content: "You are a patient English tutor. If the user speaks Hindi, translate it. Keep responses to 1-2 short sentences." }
];

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
const synth = window.speechSynthesis;

recognition.lang = 'en-US';
let isConversationActive = false;

micBtn.onclick = () => {
    if (!isConversationActive) {
        isConversationActive = true;
        startListening();
    } else {
        stopConversation();
    }
};

function startListening() {
    if (!isConversationActive) return;
    try {
        recognition.start();
        statusText.innerText = "Listening...";
    } catch (e) {}
}

function stopConversation() {
    isConversationActive = false;
    recognition.stop();
    synth.cancel();
    statusText.innerText = "Stopped.";
}

recognition.onresult = async (event) => {
    const text = event.results[0][0].transcript;
    appendMsg(text, 'user');
    statusText.innerText = "Thinking...";
    await askAI(text);
};

async function askAI(text) {
    history.push({ role: "user", content: text });

    try {
        // We use the direct Groq API but with specific settings to avoid browser blocks
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant", // Using the 8b model for ultra-speed
                messages: history,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || "API Error");
        }

        const data = await response.json();
        const aiText = data.choices[0].message.content;
        
        history.push({ role: "assistant", content: aiText });
        appendMsg(aiText, 'ai');
        speak(aiText);

    } catch (err) {
        console.error("DEBUG:", err);
        statusText.innerText = "Error: " + err.message;
        // Auto-restart mic after 3 seconds so she isn't stuck
        setTimeout(startListening, 3000);
    }
}

function speak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 0.9;
    speech.onstart = () => { statusText.innerText = "AI is talking..."; };
    speech.onend = () => {
        if (isConversationActive) {
            setTimeout(startListening, 500);
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
