import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Configuration to allow cross-origin requests in browser environments
env.allowLocalModels = false;
env.useBrowserCache = true;

const statusLabel = document.getElementById('status');
const outputBox = document.getElementById('output');
const inputBox = document.getElementById('input');
const sendBtn = document.getElementById('send');
const progressBar = document.getElementById('progress-bar');

let generator;

async function init() {
    try {
        statusLabel.textContent = "Status: Fetching Xenova/SmolLM2 (WASM)...";
        
        // Using the Xenova namespace which is more stable for Transformers.js v2/v3 transitions
        generator = await pipeline('text-generation', 'Xenova/SmolLM2-135M-Instruct', {
            device: 'wasm',
            progress_callback: (data) => {
                if (data.status === 'progress') {
                    progressBar.style.width = `${data.progress}%`;
                    statusLabel.textContent = `Status: Downloading ${Math.round(data.progress)}%`;
                }
            }
        });

        statusLabel.textContent = "Status: Online (CPU Mode)";
        outputBox.innerHTML = "System: Model ready. Inference running on your processor.\n---";
        inputBox.disabled = false;
        inputBox.placeholder = "Type your message...";
        sendBtn.disabled = false;
        progressBar.parentElement.style.display = 'none';

    } catch (err) {
        statusLabel.textContent = "Status: Initialization Failed";
        outputBox.innerHTML = `<span style="color: #ff6b6b">Error: ${err.message}</span>\n\nEnsure you are running via http://localhost and not file://`;
        console.error("Initialization Error Details:", err);
    }
}

async function handleChat() {
    const userText = inputBox.value.trim();
    if (!userText || sendBtn.disabled) return;

    inputBox.value = '';
    sendBtn.disabled = true;
    statusLabel.textContent = "Status: CPU is thinking...";
    
    outputBox.innerHTML += `\n\n<span class="user-msg">You:</span> ${userText}\n<span class="ai-msg">AI:</span> `;

    try {
        const messages = [{ role: "user", content: userText }];
        
        // SmolLM2 usually expects a specific prompt format, pipeline handles it with 'messages'
        const response = await generator(messages, { 
            max_new_tokens: 128,
            temperature: 0.6,
            do_sample: true,
            top_k: 40
        });

        const reply = response[0].generated_text.at(-1).content;
        outputBox.innerHTML += reply;
    } catch (e) {
        outputBox.innerHTML += `\n<span style="color:red">[Generation Error: ${e.message}]</span>`;
        console.error("Generation Error Details:", e);
    }

    statusLabel.textContent = "Status: Online (CPU Mode)";
    sendBtn.disabled = false;
    outputBox.scrollTop = outputBox.scrollHeight;
}

// Event Listeners
sendBtn.addEventListener('click', handleChat);
inputBox.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });

// Start the engine
init();