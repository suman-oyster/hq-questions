class OysterHQApp {
    constructor() {
        this.currentFilter = 'all';
        this.questions = [];
        this.hqTeam = ['Nick', 'Niraj', 'Minal', 'Sarju', 'Anyone'];
        this.currentUser = null;
        this.refreshTimer = null;
        this.currentQuestion = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkLoginStatus();
        this.setupAutoRefresh();
    }
    
    // ========================================================================
    // AUTHENTICATION & USER SELECTION
    // ========================================================================
    
    checkLoginStatus() {
        const isLoggedIn = localStorage.getItem(CONFIG.STORAGE_KEYS.LOGIN_STATUS) === 'true';
        const savedUser = localStorage.getItem('oyster_current_user');
        
        if (isLoggedIn && savedUser) {
            this.currentUser = savedUser;
            this.showApp();
            this.loadQuestions();
        } else if (isLoggedIn && !savedUser) {
            this.showUserSelection();
        } else {
            this.showLogin();
        }
    }
    
    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('user-selection-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'none';
        document.getElementById('password').focus();
    }
    
    showUserSelection() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('user-selection-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
        
        // Populate user buttons
        this.renderUserButtons();
    }
    
    showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('user-selection-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        
        // Update header with current user
        this.updateUserHeader();
    }
    
    renderUserButtons() {
        const container = document.getElementById('user-buttons');
        const availableUsers = this.hqTeam.filter(name => name !== 'Anyone');
        
        container.innerHTML = availableUsers.map(name => 
            `<button class="user-btn" onclick="app.setCurrentUser('${name}')">${name}</button>`
        ).join('');
    }
    
    setCurrentUser(userName) {
        // Find the clicked button and show loading state
        const clickedBtn = event.target;
        const allBtns = document.querySelectorAll('.user-btn');
        
        // Disable all buttons and show loading on clicked one
        allBtns.forEach(btn => {
            btn.disabled = true;
            if (btn === clickedBtn) {
                this.setButtonLoading(btn, true, 'Loading...');
            } else {
                btn.style.opacity = '0.5';
            }
        });
        
        UTILS.showToast(`Setting up ${userName}'s workspace...`, 'info');
        
        // Small delay to show the loading state, then proceed
        setTimeout(() => {
            this.currentUser = userName;
            localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER, userName);
            localStorage.setItem(CONFIG.STORAGE_KEYS.LOGIN_STATUS, 'true');
            this.showApp();
            this.loadData(); // This will show "Loading data..." 
            UTILS.showToast(`Welcome, ${userName}!`);
        }, 500);
    }
    
    getCurrentUser() {
        return this.currentUser || localStorage.getItem('oyster_current_user') || 'HQ Team';
    }
    
    updateUserHeader() {
        const currentUser = this.getCurrentUser();
        const headerContent = document.querySelector('.header-content h1');
        headerContent.innerHTML = `🏢 Oyster HQ <span class="user-indicator">${currentUser}</span>`;
    }
    
    handleLogin(password) {
        const loginBtn = document.querySelector('#login-form button[type="submit"]');
        const loginForm = document.getElementById('login-form');
        
        this.setButtonLoading(loginBtn, true, 'Checking...');
        this.setFormLoading(loginForm, true);
        UTILS.showToast('Verifying password...', 'info');
        
        if (password === CONFIG.PASSWORD) {
            UTILS.showToast('Loading team data...', 'info');
            this.loadTeamData().then(() => {
                this.setButtonLoading(loginBtn, false);
                this.setFormLoading(loginForm, false);
                this.showUserSelection();
                UTILS.showToast('Welcome! Please select your name.');
            });
            document.getElementById('login-error').style.display = 'none';
            return true;
        } else {
            this.setButtonLoading(loginBtn, false);
            this.setFormLoading(loginForm, false);
            document.getElementById('login-error').style.display = 'block';
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
            return false;
        }
    }
    
    handleLogout() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.LOGIN_STATUS);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.CACHED_DATA);
        localStorage.removeItem('oyster_current_user');
        this.currentUser = null;
        this.showLogin();
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
    }
    
    // Load team data for user selection
    async loadTeamData() {
        try {
            UTILS.showToast('Loading team information...', 'info');
            const data = await this.loadWithJsonp(`${CONFIG.API_URL}?action=getQuestions`);
            console.log('Team data response:', data);
            
            if (data.success && data.hqTeam) {  // For HQ portal
                this.hqTeam = data.hqTeam;
                console.log('Loaded HQ team:', this.hqTeam);
            } else if (data.success && data.team) {  // Fallback
                this.hqTeam = data.team;
                console.log('Loaded team (fallback):', this.hqTeam);
            }
        } catch (error) {
            console.error('Error loading team data:', error);
            UTILS.showToast('Could not load team data, using defaults', 'error');
            this.hqTeam = ['Nick', 'Minal', 'Sarju', 'Anyone'];
        }
    }

    setButtonLoading(buttonElement, loading, originalText = null) {
        if (loading) {
            if (!buttonElement.dataset.originalText) {
                buttonElement.dataset.originalText = buttonElement.textContent;
            }
            buttonElement.classList.add('loading');
            buttonElement.disabled = true;
            if (originalText) buttonElement.textContent = originalText;
        } else {
            buttonElement.classList.remove('loading');
            buttonElement.disabled = false;
            if (buttonElement.dataset.originalText) {
                buttonElement.textContent = buttonElement.dataset.originalText;
                delete buttonElement.dataset.originalText;
            }
        }
    }
    
    setFormLoading(formElement, loading) {
        if (loading) {
            formElement.classList.add('form-loading');
        } else {
            formElement.classList.remove('form-loading');
        }
    }
    
    // ========================================================================
    // DATA LOADING
    // ========================================================================
    
    async loadQuestions() {
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) this.setButtonLoading(refreshBtn, true);
        
        try {
            this.showLoading(true);
            UTILS.showToast('Loading questions...', 'info');
            
            const data = await this.loadWithJsonp(`${CONFIG.API_URL}?action=getQuestions`);
            
            if (data.success) {
                this.questions = data.questions || [];
                this.hqTeam = data.hqTeam || this.hqTeam;
                this.cacheData(this.questions);
                this.renderQuestions();
                this.updateStats();
                this.updateLastUpdated();
                UTILS.showToast('Questions loaded successfully');
            } else {
                throw new Error(data.error || 'Failed to load questions');
            }
            
        } catch (error) {
            console.error('Error loading questions:', error);
            this.loadCachedData();
            UTILS.showToast('Failed to load questions. Showing cached data.', 'error');
        } finally {
            this.showLoading(false);
            if (refreshBtn) this.setButtonLoading(refreshBtn, false);
        }
    }
    
    loadCachedData() {
        const cached = localStorage.getItem(CONFIG.STORAGE_KEYS.CACHED_DATA);
        if (cached) {
            try {
                this.questions = JSON.parse(cached);
                this.renderQuestions();
                this.updateStats();
            } catch (error) {
                console.error('Error loading cached data:', error);
                this.questions = [];
                this.renderQuestions();
            }
        }
    }
    
    cacheData(questions) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.CACHED_DATA, JSON.stringify(questions));
        localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
    }
    
    loadWithJsonp(url) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
            
            window[callbackName] = function(data) {
                resolve(data);
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
                delete window[callbackName];
            };
            
            const script = document.createElement('script');
            script.src = url + '&callback=' + callbackName;
            script.onerror = function() {
                reject(new Error('Failed to load data'));
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
                delete window[callbackName];
            };
            
            document.head.appendChild(script);
        });
    }
    
    // ========================================================================
    // FILTERING
    // ========================================================================
    
    filterQuestions(questions) {
        const currentUser = this.getCurrentUser();
        
        switch (this.currentFilter) {
            case 'unanswered':
                return questions.filter(q => !q.finalResponse || q.finalResponse.trim() === '');
            case 'answered':
                return questions.filter(q => q.finalResponse && q.finalResponse.trim() !== '');
            case 'unanswered-me':
                return questions.filter(q => 
                    (!q.finalResponse || q.finalResponse.trim() === '') && 
                    this.isDirectedToMe(q.directedTo)
                );
            case 'answered-me':
                return questions.filter(q => 
                    (q.finalResponse && q.finalResponse.trim() !== '') && 
                    this.isDirectedToMe(q.directedTo)
                );
            default:
                return questions;
        }
    }
    
    isDirectedToMe(directedTo) {
        const currentUser = this.getCurrentUser();
        return directedTo === currentUser;
    }
    
    // ========================================================================
    // UI RENDERING
    // ========================================================================
    
    renderQuestions() {
        const container = document.getElementById('questions-content');
        const noQuestionsEl = document.getElementById('no-questions');
        
        const filteredQuestions = this.filterQuestions(this.questions);
        
        if (filteredQuestions.length === 0) {
            container.innerHTML = '';
            noQuestionsEl.style.display = 'block';
            return;
        }
        
        noQuestionsEl.style.display = 'none';
        
        // Sort by priority and timestamp
        filteredQuestions.sort((a, b) => {
            const priorityA = parseInt(a.priority?.replace('P', '') || '3');
            const priorityB = parseInt(b.priority?.replace('P', '') || '3');
            
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            
            const timeA = new Date(a.timestamp || 0);
            const timeB = new Date(b.timestamp || 0);
            return timeB - timeA;
        });
        
        container.innerHTML = filteredQuestions.map(question => this.renderQuestionCard(question)).join('');
    }
    
    renderQuestionCard(question) {
        const priorityInfo = UTILS.getPriorityInfo(question.priority);
        const fixfloUrl = UTILS.getFixfloUrl(question.fixfloId);
        const timeAgo = UTILS.formatTime(question.timestamp);
        const summary = UTILS.getQuestionSummary(question, 120);
        const hasResponse = question.finalResponse && question.finalResponse.trim() !== '';
        
        const statusBadge = hasResponse 
            ? '<span class="status-badge answered">✅ Answered</span>'
            : '<span class="status-badge pending">⏳ Pending</span>';
        
        return `
            <div class="question-card priority-${question.priority?.toLowerCase()}" onclick="app.openQuestion('${question.id}')">
                <div class="question-header">
                    <div class="question-meta">
                        <div class="badges-row">
                            <span class="priority-badge ${question.priority?.toLowerCase()}">${priorityInfo.emoji} ${question.priority}</span>
                            ${statusBadge}
                            <span class="directed-badge">→ ${question.directedTo || 'Anyone'}</span>
                        </div>
                        <span class="question-time">⏰ ${timeAgo}</span>
                    </div>
                    <div class="question-title">📍 ${question.property || 'Unknown Property'}</div>
                    <div class="question-details">
                        <span>👤 ${question.askedBy || 'Unknown'}</span>
                        ${question.fixfloId ? `<span>🎫 ${question.fixfloId}</span>` : ''}
                    </div>
                </div>
                <div class="question-body">
                    <div class="question-text">${summary}</div>
                    <div class="question-actions">
                        ${fixfloUrl ? `<a href="${fixfloUrl}" target="_blank" class="fixflo-link" onclick="event.stopPropagation();">🎫 View Fixflo Case</a>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    updateStats() {
        const currentUser = this.getCurrentUser();
        const urgentCount = this.questions.filter(q => 
            UTILS.isUrgent(q.priority) && (!q.finalResponse || q.finalResponse.trim() === '')
        ).length;
        
        const totalUnanswered = this.questions.filter(q => 
            !q.finalResponse || q.finalResponse.trim() === ''
        ).length;
        
        document.getElementById('urgent-count').textContent = urgentCount;
        document.getElementById('total-count').textContent = totalUnanswered;
    }
    
    updateLastUpdated() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        document.getElementById('last-updated').textContent = timeStr;
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading');
        const content = document.getElementById('questions-content');
        
        if (show) {
            loading.style.display = 'block';
            content.style.display = 'none';
        } else {
            loading.style.display = 'none';
            content.style.display = 'block';
        }
    }
    
    // ========================================================================
    // QUESTION DETAIL MODAL
    // ========================================================================
    
    openQuestion(questionId) {
        const question = this.questions.find(q => q.id === questionId);
        if (!question) {
            UTILS.showToast('Question not found', 'error');
            return;
        }
        
        this.currentQuestion = question;
        this.renderQuestionDetail(question);
        document.getElementById('question-modal').style.display = 'flex';
    }
    
    renderQuestionDetail(question) {
        const priorityInfo = UTILS.getPriorityInfo(question.priority);
        const fixfloUrl = UTILS.getFixfloUrl(question.fixfloId);
        const timeFormatted = new Date(question.timestamp).toLocaleString('en-GB');
        const thread = UTILS.parseThread(question.thread);
        const hasResponse = question.finalResponse && question.finalResponse.trim() !== '';
        
        const directedTo = question.directedTo || 'Anyone';
        document.getElementById('modal-title').textContent = `${priorityInfo.emoji} ${question.priority} → ${directedTo}`;
        
        const statusBadge = hasResponse 
            ? '<span class="status-badge answered">✅ Answered</span>'
            : '<span class="status-badge pending">⏳ Pending</span>';
        
        const detailsHtml = `
            <div class="question-detail-header">
                <div class="modal-status-row">
                    ${statusBadge}
                    <span class="modal-directed">Directed to: <strong>${directedTo}</strong></span>
                </div>
                
                <div class="detail-meta">
                    <div class="detail-item">
                        <strong>📍 Property:</strong> ${question.property || 'Not specified'}
                    </div>
                    <div class="detail-item">
                        <strong>👤 Asked by:</strong> ${question.askedBy || 'Unknown'}
                    </div>
                    <div class="detail-item">
                        <strong>⏰ Time:</strong> ${timeFormatted}
                    </div>
                    ${question.fixfloId ? `
                    <div class="detail-item">
                        <strong>🎫 Fixflo:</strong> 
                        <a href="${fixfloUrl}" target="_blank" class="fixflo-link">${question.fixfloId}</a>
                    </div>
                    ` : ''}
                </div>
                
                <div class="detail-question">
                    <strong>Question:</strong><br>
                    ${question.question || 'No question text provided'}
                </div>
            </div>
        `;
        
        document.getElementById('question-details').innerHTML = detailsHtml;
        
        this.renderThread(thread);
        document.getElementById('thread-section').style.display = 'block';
        
        if (question.finalResponse) {
            document.getElementById('response-text').value = question.finalResponse;
        } else {
            document.getElementById('response-text').value = '';
        }
    }
    
    renderThread(messages) {
        if (messages.length === 0) {
            document.getElementById('thread-content').innerHTML = '<p style="color: #7f8c8d; font-style: italic;">No conversation yet.</p>';
            return;
        }
        
        const threadHtml = messages.map(msg => {
            const isHQ = msg.author.includes('HQ') || this.hqTeam.some(name => name !== 'Anyone' && msg.author.includes(name));
            const messageClass = isHQ ? 'hq-message' : 'team-message';
            const metaClass = isHQ ? 'hq' : 'team';
            
            return `
                <div class="thread-message ${messageClass}">
                    <div class="thread-meta ${metaClass}">${msg.timestamp} - ${msg.author}</div>
                    <div class="thread-content">${msg.content}</div>
                </div>
            `;
        }).join('');
        
        document.getElementById('thread-content').innerHTML = threadHtml;
    }
    
    closeModal() {
        document.getElementById('question-modal').style.display = 'none';
        this.currentQuestion = null;
    }
    
    // ========================================================================
    // RESPONSE SUBMISSION
    // ========================================================================
    
    async submitResponse() {
        if (!this.currentQuestion) return;
        
        const submitBtn = document.getElementById('submit-response-btn');
        const responseForm = document.getElementById('response-section');
        
        this.setButtonLoading(submitBtn, true, 'Submitting...');
        this.setFormLoading(responseForm, true);
        UTILS.showToast('Submitting response...', 'info');
        
        const responseText = document.getElementById('response-text').value.trim();
        
        if (!responseText) {
            UTILS.showToast('Please enter a response', 'error');
            this.setButtonLoading(submitBtn, false);
            this.setFormLoading(responseForm, false);
            return;
        }
        
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: 'submitResponse',
                    questionId: this.currentQuestion.id,
                    response: responseText,
                    responderName: this.getCurrentUser()
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                UTILS.showToast('Response submitted successfully!');
                this.closeModal();
                this.loadQuestions();
            } else {
                throw new Error(data.error || 'Failed to submit response');
            }
            
        } catch (error) {
            console.error('Error submitting response:', error);
            UTILS.showToast('Failed to submit response', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false);
            this.setFormLoading(responseForm, false);
        }
    }
    
    async addThreadMessage() {
        if (!this.currentQuestion) return;
        
        const addBtn = document.getElementById('add-thread-btn');
        this.setButtonLoading(addBtn, true, 'Sending...');
        UTILS.showToast('Sending message...', 'info');
        
        const messageText = document.getElementById('thread-message').value.trim();
        
        if (!messageText) {
            UTILS.showToast('Please enter a message', 'error');
            this.setButtonLoading(addBtn, false);
            return;
        }
        
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: 'addThread',
                    questionId: this.currentQuestion.id,
                    message: messageText,
                    hqMemberName: this.getCurrentUser()
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                UTILS.showToast('Message added to thread');
                document.getElementById('thread-message').value = '';
                this.loadQuestions();
                const updatedQuestion = this.questions.find(q => q.id === this.currentQuestion.id);
                if (updatedQuestion) {
                    this.renderQuestionDetail(updatedQuestion);
                }
            } else {
                throw new Error(data.error || 'Failed to add message');
            }
            
        } catch (error) {
            console.error('Error adding thread message:', error);
            UTILS.showToast('Failed to add message', 'error');
        } finally {
            this.setButtonLoading(addBtn, false);
        }
    }
    
    // ========================================================================
    // EVENT LISTENERS
    // ========================================================================
    
    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            this.handleLogin(password);
        });
        
        // Header controls
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadQuestions();
        });
        
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.filter;
                
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                this.renderQuestions();
            });
        });
        
        // Modal controls
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('question-modal').addEventListener('click', (e) => {
            if (e.target.id === 'question-modal') {
                this.closeModal();
            }
        });
        
        // Response actions
        document.getElementById('submit-response-btn').addEventListener('click', () => {
            this.submitResponse();
        });
        
        document.getElementById('cancel-response-btn').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('add-thread-btn').addEventListener('click', () => {
            this.addThreadMessage();
        });
        
        // Toast close buttons
        document.querySelectorAll('.toast-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.toast').style.display = 'none';
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }
    
    setupAutoRefresh() {
        if (CONFIG.FEATURES.AUTO_REFRESH) {
            this.refreshTimer = setInterval(() => {
                this.loadQuestions();
            }, CONFIG.REFRESH_INTERVAL);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new OysterHQApp();
});
