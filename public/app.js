// ===== STATE & AUTH =====
const authOverlay = document.getElementById('authOverlay');
const mainDashboard = document.getElementById('mainDashboard');
const instaModal = document.getElementById('instaModal');
let currentUser = null;
let currentEmail = null;
let currentPhone = null;

// Handle Initial Load
document.addEventListener("DOMContentLoaded", () => {
    mainDashboard.style.display = 'none';
    const savedToken = localStorage.getItem('agentic_token');
    
    if (savedToken) {
        currentUser = localStorage.getItem('agenticUser_name');
        currentEmail = localStorage.getItem('agenticUser_email');
        loadChatHistory();
        initDashboard();
    }
});

// === OTP AUTHENTICATION ===
async function requestOTP(e) {
    e.preventDefault();
    const name = document.getElementById('authName').value;
    const email = document.getElementById('authEmail').value;
    const phone = document.getElementById('authPhone').value;
    const btn = document.getElementById('requestOtpBtn');
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/send-otp', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, phone })
        });
        const data = await res.json();
        
        if (data.success) {
            currentUser = name;
            currentEmail = email;
            currentPhone = phone;
            
            // Switch UI to OTP step
            document.getElementById('authStep1').style.display = 'none';
            document.getElementById('otpForm').style.display = 'block';
        } else {
            alert(data.error || "Failed to send OTP.");
        }
    } catch (err) {
        alert("Server error. Ensure backend is running.");
    } finally {
        btn.innerHTML = '<span>Send Secure OTP</span> <i class="fas fa-shield-alt"></i>';
        btn.disabled = false;
    }
}

async function verifyOTP(e) {
    e.preventDefault();
    const otp = document.getElementById('authOtp').value;
    const btn = document.getElementById('verifyOtpBtn');
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: currentEmail, otp })
        });
        const data = await res.json();
        
        if (data.success) {
            // Save Session
            localStorage.setItem('agentic_token', data.token);
            localStorage.setItem('agenticUser_name', currentUser);
            localStorage.setItem('agenticUser_email', currentEmail);
            
            // Show Insta Modal before dashboard
            authOverlay.classList.remove('active');
            setTimeout(() => {
                instaModal.classList.add('active');
            }, 500);
        } else {
            alert(data.error || "Invalid OTP");
        }
    } catch (err) {
        alert("Verification failed.");
    } finally {
        btn.innerHTML = 'Verify & Login';
        btn.disabled = false;
    }
}

function resetAuth() {
    document.getElementById('otpForm').style.display = 'none';
    document.getElementById('authStep1').style.display = 'block';
}

function closeInstaModal() {
    instaModal.classList.remove('active');
    initDashboard();
}

function initDashboard() {
    document.getElementById('displayUserName').innerText = currentUser;
    mainDashboard.style.display = 'flex';
}

function logout() {
    localStorage.removeItem('agentic_token');
    localStorage.removeItem('agenticUser_name');
    localStorage.removeItem('agenticUser_email');
    currentUser = null;
    mainDashboard.style.display = 'none';
    resetAuth();
    authOverlay.classList.add('active');
}

// ===== SIDEBAR TOGGLES (Mobile) =====
function toggleSidebar() {
    document.getElementById('leftSidebar').classList.toggle('active');
}

// ===== MODE SELECTION =====
let currentMode = 'General Chat';
function setMode(mode) {
    currentMode = mode;
    document.getElementById('modeBadge').innerText = mode;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    if(window.innerWidth <= 768) toggleSidebar();
}

// ===== NEW CHAT & HISTORY =====
let chatSessions = JSON.parse(localStorage.getItem('agentic_chats') || '[]');
let currentSessionId = Date.now().toString();

function startNewChat() {
    currentSessionId = Date.now().toString();
    const chatHistory = document.getElementById('chatHistory');
    chatHistory.innerHTML = `
        <div class="message ai-message">
            <div class="avatar-3d"><img src="logo.png" alt="AI" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Aasif'"></div>
            <div class="content glass-bubble-3d">
                New session started. I am ready. What is your next task?
            </div>
        </div>
    `;
    loadChatHistory();
}

function saveChatToHistory(firstMessage) {
    const existing = chatSessions.find(s => s.id === currentSessionId);
    if (!existing) {
        const title = firstMessage.length > 25 ? firstMessage.substring(0, 25) + '...' : firstMessage;
        chatSessions.unshift({ id: currentSessionId, title });
        if (chatSessions.length > 10) chatSessions.pop(); // keep last 10
        localStorage.setItem('agentic_chats', JSON.stringify(chatSessions));
        loadChatHistory();
    }
}

function loadChatHistory() {
    const container = document.getElementById('historyContainer');
    container.innerHTML = '';
    chatSessions.forEach(session => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `<i class="fas fa-history"></i> ${session.title}`;
        div.onclick = () => alert("Loading past history completely requires database integration. Start a New Chat to continue.");
        container.appendChild(div);
    });
}

// ===== VOICE ASSISTANT =====
const voiceBtnLocal = document.getElementById('voiceBtn');
let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('taskInput').value += (document.getElementById('taskInput').value ? ' ' : '') + transcript;
        voiceBtnLocal.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceBtnLocal.style.color = 'var(--text-muted)';
    };

    recognition.onerror = function() {
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
        voiceBtnLocal.style.color = 'var(--primary)';
    } else {
        alert("Speech Recognition is not supported in this browser.");
    }
});

// ===== CHAT LOGIC =====
const chatHistoryDOM = document.getElementById('chatHistory');
const runBtn = document.getElementById('runBtn');
const taskInput = document.getElementById('taskInput');
let eventSource = null;

function addMessage(role, htmlContent) {
    const div = document.createElement('div');
    div.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    
    if (role === 'user') {
        div.innerHTML = `
            <div class="avatar-3d">${currentUser ? currentUser.charAt(0).toUpperCase() : 'U'}</div>
            <div class="content glass-bubble-3d">${htmlContent}</div>
        `;
    } else {
        div.innerHTML = `
            <div class="avatar-3d"><img src="logo.png" alt="AI" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=Aasif'"></div>
            <div class="content glass-bubble-3d">${htmlContent}</div>
        `;
    }
    chatHistoryDOM.appendChild(div);
    chatHistoryDOM.scrollTop = chatHistoryDOM.scrollHeight;
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

    saveChatToHistory(task);

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
    
    const aiContentBox = addMessage('ai', '<i class="fas fa-circle-notch fa-spin"></i> Processing...');
    let currentLogs = '';

    if (eventSource) eventSource.close();
    eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'status' || data.type === 'thought' || data.type === 'action') {
            const icon = data.type === 'action' ? '⚙️' : '🧠';
            const cssClass = data.type === 'action' ? 'tool-step success' : 'tool-step';
            currentLogs += `<div class="${cssClass}">${icon} ${data.message}</div>`;
            aiContentBox.innerHTML = currentLogs + '<br><span style="color:var(--text-muted); font-size: 0.9rem;"><i class="fas fa-spinner fa-spin"></i> Working...</span>';
            chatHistoryDOM.scrollTop = chatHistoryDOM.scrollHeight;
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
            body: JSON.stringify({ task: enhancedTask, userId: currentEmail, plan: 'max', deepThinking: isDeepThinking })
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
