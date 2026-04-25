// ===== STATE & AUTH =====
const authOverlay = document.getElementById('authOverlay');
const mainDashboard = document.getElementById('mainDashboard');
const instaModal = document.getElementById('instaModal');
const settingsModal = document.getElementById('settingsModal');
let currentUser = null;
let currentPhone = null;

// Handle Initial Load
document.addEventListener("DOMContentLoaded", () => {
    // Hide dashboard initially
    mainDashboard.style.display = 'none';
    
    // Check if user is already logged in
    const savedUser = localStorage.getItem('agenticUser_email');
    if (savedUser) {
        currentUser = localStorage.getItem('agenticUser_name');
        currentPhone = localStorage.getItem('agenticUser_phone');
        initDashboard();
    }
});

function handleAuth(e) {
    e.preventDefault();
    const name = document.getElementById('authName').value;
    const email = document.getElementById('authEmail').value;
    const phone = document.getElementById('authPhone').value;
    const pass = document.getElementById('authPass').value;
    
    // Basic Validation
    if(pass.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    // Save Details
    localStorage.setItem('agenticUser_email', email);
    localStorage.setItem('agenticUser_name', name);
    localStorage.setItem('agenticUser_phone', phone);
    
    currentUser = name;
    currentPhone = phone;

    // Simulate Email/SMS Greeting via backend
    fetch('/api/greet', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, email, phone })
    }).catch(err => console.log("Greeting send failed"));

    // Hide Auth, Show Insta Modal First
    authOverlay.classList.remove('active');
    setTimeout(() => {
        instaModal.classList.add('active');
    }, 500);
}

function closeInstaModal() {
    instaModal.classList.remove('active');
    initDashboard();
}

function initDashboard() {
    document.getElementById('displayUserName').innerText = currentUser;
    mainDashboard.style.display = 'flex';
    
    // Set theme from local storage
    const savedTheme = localStorage.getItem('agentic_theme') || 'theme-dark';
    changeTheme(savedTheme);
    document.getElementById('themeSelector').value = savedTheme;
}

function logout() {
    localStorage.removeItem('agenticUser_email');
    currentUser = null;
    mainDashboard.style.display = 'none';
    authOverlay.classList.add('active');
}

// ===== SETTINGS & THEMES =====
function openSettings() {
    document.getElementById('updateName').value = currentUser;
    document.getElementById('updatePhone').value = currentPhone;
    settingsModal.classList.add('active');
}
function closeSettings() { settingsModal.classList.remove('active'); }

function saveSettings() {
    const newName = document.getElementById('updateName').value;
    const newPhone = document.getElementById('updatePhone').value;
    
    if(newName) {
        currentUser = newName;
        localStorage.setItem('agenticUser_name', newName);
        document.getElementById('displayUserName').innerText = currentUser;
    }
    if(newPhone) {
        currentPhone = newPhone;
        localStorage.setItem('agenticUser_phone', newPhone);
    }
    closeSettings();
    alert("Profile updated securely.");
}

function changeTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem('agentic_theme', themeName);
}

// ===== SIDEBAR TOGGLES (Mobile) =====
function toggleSidebar() {
    document.getElementById('leftSidebar').classList.toggle('active');
}
function toggleNews() {
    document.getElementById('newsSidebar').classList.toggle('active');
}

// ===== MODE SELECTION =====
let currentMode = 'General Chat';
function setMode(mode) {
    currentMode = mode;
    document.getElementById('modeBadge').innerText = mode;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if(window.innerWidth <= 768) toggleSidebar(); // Close sidebar on mobile after selection
}

// ===== VOICE ASSISTANT =====
const voiceBtnLocal = document.getElementById('voiceBtn');
let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('taskInput').value += (document.getElementById('taskInput').value ? ' ' : '') + transcript;
        voiceBtnLocal.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceBtnLocal.style.color = 'var(--text-muted)';
    };

    recognition.onerror = function(event) {
        console.error("Speech Recognition Error:", event.error);
        voiceBtnLocal.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        setTimeout(() => voiceBtnLocal.innerHTML = '<i class="fas fa-microphone"></i>', 2000);
    };

    recognition.onend = function() {
        voiceBtnLocal.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceBtnLocal.style.color = 'var(--text-muted)';
    };
}

voiceBtnLocal.addEventListener('click', () => {
    if (recognition) {
        recognition.start();
        voiceBtnLocal.innerHTML = '<i class="fas fa-microphone" style="animation: pulse 1s infinite;"></i>';
        voiceBtnLocal.style.color = 'var(--danger)';
    } else {
        alert("Speech Recognition is not supported in this browser.");
    }
});

// ===== CHAT LOGIC =====
const chatHistory = document.getElementById('chatHistory');
const runBtn = document.getElementById('runBtn');
const taskInput = document.getElementById('taskInput');
let eventSource = null;

function addMessage(role, htmlContent) {
    const div = document.createElement('div');
    div.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    
    if (role === 'user') {
        div.innerHTML = `
            <div class="avatar">${currentUser ? currentUser.charAt(0).toUpperCase() : 'U'}</div>
            <div class="content">${htmlContent}</div>
        `;
    } else {
        div.innerHTML = `
            <div class="avatar"><img src="logo.png" alt="AI" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Aasif'"></div>
            <div class="content">${htmlContent}</div>
        `;
    }
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return div.querySelector('.content');
}

taskInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        runBtn.click();
    }
});

runBtn.addEventListener('click', async () => {
    let task = taskInput.value.trim();
    if (!task) return;

    // Prepare Task based on mode
    const isDeepThinking = document.getElementById('deepThinkingToggle').checked;
    let enhancedTask = task;
    
    if(currentMode === 'Research') enhancedTask = "[RESEARCH FOCUS] " + task;
    else if(currentMode === 'Business') enhancedTask = "[BUSINESS FOCUS] " + task;
    else if(currentMode === 'Stock Market') enhancedTask = "[STOCK MARKET ANALYSIS] " + task;
    else if(currentMode === 'Crypto') enhancedTask = "[CRYPTO ANALYSIS] " + task;
    else if(currentMode === 'Forex') enhancedTask = "[FOREX ANALYSIS] " + task;

    if(isDeepThinking) enhancedTask += " (INSTRUCTION: Execute Max Reasoning. Analyze edge cases thoroughly.)";

    addMessage('user', task.replace(/\n/g, '<br>'));
    taskInput.value = '';
    runBtn.disabled = true;
    
    const aiContentBox = addMessage('ai', 'Thinking...');
    let currentLogs = '';

    if (eventSource) eventSource.close();
    eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'status' || data.type === 'thought' || data.type === 'action') {
            const icon = data.type === 'action' ? '⚙️' : '🧠';
            const cssClass = data.type === 'action' ? 'tool-step success' : 'tool-step';
            currentLogs += `<div class="${cssClass}">${icon} ${data.message}</div>`;
            aiContentBox.innerHTML = currentLogs + '<br><span style="color:var(--text-muted); font-size: 0.9rem;">Processing...</span>';
            chatHistory.scrollTop = chatHistory.scrollHeight;
        } else if (data.type === 'answer') {
            const formattedAnswer = data.message.replace(/\n/g, '<br>');
            aiContentBox.innerHTML = currentLogs + `<br><div style="margin-top: 15px;">${formattedAnswer}</div>`;
            eventSource.close();
            runBtn.disabled = false;
        } else if (data.type === 'error') {
            aiContentBox.innerHTML += `<br><span style="color: var(--danger);">❌ ${data.message}</span>`;
            eventSource.close();
            runBtn.disabled = false;
        }
    };

    try {
        const response = await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task: enhancedTask, userId: currentUser, deepThinking: isDeepThinking })
        });
        
        if (!response.ok) {
            aiContentBox.innerHTML = `<span style="color: var(--danger);">❌ Server Error.</span>`;
            eventSource.close();
            runBtn.disabled = false;
        }
    } catch (err) {
        aiContentBox.innerHTML = `<span style="color: var(--danger);">❌ Connection failed.</span>`;
        runBtn.disabled = false;
    }
});

// Mock Live News Updates
setInterval(() => {
    const newsItems = [
        { tag: 'stock', class: 'stock', text: 'NASDAQ rallies 2% as tech earnings beat expectations.' },
        { tag: 'crypto', class: 'crypto', text: 'Ethereum layer 2 TVL hits all-time high of $45B.' },
        { tag: 'ai', class: 'ai', text: 'Md Aasif Raza Agentic AI deployed globally with 0 downtime.' },
        { tag: 'forex', class: 'forex', text: 'EUR/USD drops below 1.08 amid strong US employment data.' },
        { tag: 'stock', class: 'stock', text: 'Tesla announces new fully autonomous robotaxi.' },
    ];
    
    const randomNews = newsItems[Math.floor(Math.random() * newsItems.length)];
    const newsList = document.getElementById('newsList');
    
    const newEl = document.createElement('div');
    newEl.className = 'news-card';
    newEl.innerHTML = `<span class="news-tag ${randomNews.class}">${randomNews.tag.toUpperCase()}</span><p>${randomNews.text}</p>`;
    
    newsList.insertBefore(newEl, newsList.firstChild);
    
    // Keep max 10 news items
    if(newsList.children.length > 10) {
        newsList.removeChild(newsList.lastChild);
    }
}, 10000); // Add a new news every 10 seconds
