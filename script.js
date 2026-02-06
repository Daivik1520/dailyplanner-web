/**
 * DailyPlanner - Interactive App Demo
 * All buttons and screens functional
 */

document.addEventListener('DOMContentLoaded', () => {
    // Config
    const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
    const SYSTEM_PROMPT = `You are a friendly productivity assistant for DailyPlanner app. Help users plan their day, stay focused, and manage tasks. Keep responses brief (2-3 sentences), friendly, with occasional emojis. Mention features like Focus Mode, AI Timetable, Pomodoro, and Eisenhower Matrix when relevant.`;

    // State
    let interactionCount = 0;
    let tasks = [
        { id: 1, name: 'Morning workout', time: '8:00 AM', completed: false },
        { id: 2, name: 'Deep work session', time: '10:00 AM', completed: false },
        { id: 3, name: 'Team meeting', time: '2:00 PM', completed: false }
    ];
    let focusStats = { sessionsToday: 0, sessionsWeek: 2, streak: 3 };
    let timerInterval = null;
    let timerSeconds = 25 * 60;
    let timerRunning = false;
    let timerTotal = 25 * 60;
    let chatHistory = [];

    // Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Synchronize scroll-based logic with Lenis
    lenis.on('scroll', (e) => {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            navbar.classList.toggle('scrolled', e.scroll > 50);
        }
    });

    // Magnetic Button Effect Class
    class Magnetic {
        constructor(el, strength = 0.5) {
            this.el = el;
            this.strength = strength;
            this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            this.x = 0;
            this.y = 0;
            this.width = 0;
            this.height = 0;

            if (!this.isTouch) {
                this.bindEvents();
            } else {
                this.bindTouchEvents();
            }
        }

        bindEvents() {
            this.el.addEventListener('mousemove', (e) => {
                const rect = this.el.getBoundingClientRect();
                this.width = rect.width;
                this.height = rect.height;

                const centerX = rect.left + this.width / 2;
                const centerY = rect.top + this.height / 2;

                const mouseX = e.clientX - centerX;
                const mouseY = e.clientY - centerY;

                gsap.to(this.el, {
                    x: mouseX * this.strength,
                    y: mouseY * this.strength,
                    duration: 0.6,
                    ease: "power2.out"
                });
            });

            this.el.addEventListener('mouseleave', () => {
                gsap.to(this.el, {
                    x: 0,
                    y: 0,
                    duration: 0.8,
                    ease: "elastic.out(1, 0.3)"
                });
            });
        }

        bindTouchEvents() {
            this.el.addEventListener('touchstart', () => {
                gsap.to(this.el, {
                    scale: 0.94,
                    duration: 0.2,
                    ease: "power2.out"
                });
            });

            this.el.addEventListener('touchend', () => {
                gsap.to(this.el, {
                    scale: 1,
                    duration: 0.5,
                    ease: "elastic.out(1, 0.3)"
                });
            });
        }
    }

    // Initialize Effects
    initNavigation(lenis);
    initAppNavigation();
    initTimer();
    initChat();
    initTasks();
    initModals();
    initCalendar();
    updateHomeScreen();
    setGreeting();
    setCurrentDate();
    updateInsights();

    // Apply Magnetic to major buttons
    document.querySelectorAll('.btn-hero, .btn-hero-outline, .btn-cta, .nav-cta, .social-link').forEach(btn => {
        new Magnetic(btn);
    });

    // Website Navigation
    function initNavigation(lenisInstance) {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');

        // Note: Scroll class handled by Lenis event now

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navToggle.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    navToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                });
            });
        }

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href === '#' || href.startsWith('#screen-')) return;
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    lenisInstance.scrollTo(target, {
                        offset: -80,
                        duration: 1.5,
                        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                    });
                }
            });
        });
    }

    // App Navigation
    function initAppNavigation() {
        // Bottom nav
        document.querySelectorAll('.bnav-item').forEach(item => {
            item.addEventListener('click', () => {
                const screen = item.dataset.screen;
                switchScreen(screen);
                document.querySelectorAll('.bnav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                trackInteraction();
            });
        });

        // Quick actions
        document.querySelectorAll('.quick-action-card').forEach(action => {
            action.addEventListener('click', () => {
                switchScreen(action.dataset.goto);
                updateNavActive(action.dataset.goto);
                trackInteraction();
            });
        });

        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                switchScreen(btn.dataset.goto);
                updateNavActive(btn.dataset.goto);
            });
        });

        // Text buttons with data-goto
        document.querySelectorAll('[data-goto]').forEach(btn => {
            if (!btn.classList.contains('back-btn') && !btn.classList.contains('quick-action-card') && !btn.classList.contains('bnav-item')) {
                btn.addEventListener('click', () => {
                    switchScreen(btn.dataset.goto);
                    updateNavActive(btn.dataset.goto);
                    trackInteraction();
                });
            }
        });

        // Menu button
        document.getElementById('menu-btn')?.addEventListener('click', () => {
            switchScreen('menu');
            trackInteraction();
        });

        // Calendar button
        document.getElementById('calendar-btn')?.addEventListener('click', () => {
            switchScreen('schedule');
            updateNavActive('schedule');
            trackInteraction();
        });

        // Download CTA in settings
        document.querySelector('.download-cta-btn')?.addEventListener('click', () => {
            window.open('https://play.google.com/store/apps/details?id=com.ashukaytech.daily_planner', '_blank');
        });

        // Period buttons in insights
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Settings items
        document.querySelectorAll('.setting-item').forEach(item => {
            item.addEventListener('click', () => {
                // Could open sub-screens - for demo just show modal
                document.getElementById('download-modal').classList.add('active');
            });
        });

        // Matrix add buttons
        document.querySelectorAll('.mc-add').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('add-task-modal').classList.add('active');
            });
        });
    }

    function switchScreen(screenId) {
        document.querySelectorAll('.app-screen').forEach(screen => {
            screen.classList.toggle('active', screen.dataset.screen === screenId);
        });

        const appNav = document.getElementById('app-nav');
        if (screenId === 'timer') {
            appNav.style.display = 'none';
        } else {
            appNav.style.display = 'flex';
        }
    }

    function updateNavActive(screenId) {
        document.querySelectorAll('.bnav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.screen === screenId);
        });
    }

    // Home Screen
    function updateHomeScreen() {
        const completed = tasks.filter(t => t.completed).length;
        const total = tasks.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('done-count').textContent = completed;
        document.getElementById('todo-count').textContent = total - completed;
        document.getElementById('progress-percent').textContent = percent + '%';

        const ring = document.getElementById('progress-ring');
        const circumference = 2 * Math.PI * 40;
        ring.style.strokeDasharray = circumference;
        ring.style.strokeDashoffset = circumference - (percent / 100) * circumference;

        renderTasks();
        updateTasksScreen();
    }

    function setGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Good Morning';
        if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
        else if (hour >= 17) greeting = 'Good Evening';
        document.getElementById('greeting-time').textContent = greeting;
    }

    function setCurrentDate() {
        const el = document.getElementById('current-date');
        if (el) {
            el.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
    }

    // Tasks
    function initTasks() {
        document.getElementById('add-task-btn')?.addEventListener('click', openTaskModal);
        document.getElementById('add-task-btn-2')?.addEventListener('click', openTaskModal);
    }

    function openTaskModal() {
        const modal = document.getElementById('add-task-modal');
        modal.classList.add('active');
        document.getElementById('new-task-input').value = '';
        document.getElementById('new-task-input').focus();
        trackInteraction();
    }

    function renderTasks() {
        const list = document.getElementById('tasks-list');
        list.innerHTML = tasks.slice(0, 3).map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <div class="task-check">${task.completed ? '✓' : ''}</div>
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <span class="task-time">${task.time}</span>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', () => toggleTask(parseInt(item.dataset.id)));
        });
    }

    function updateTasksScreen() {
        const list = document.getElementById('full-tasks-list');
        if (!list) return;

        const completed = tasks.filter(t => t.completed).length;
        const pending = tasks.length - completed;
        document.getElementById('completed-stat').textContent = `${completed} Completed`;
        document.getElementById('pending-stat').textContent = `${pending} Pending`;

        list.innerHTML = tasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <div class="task-check">${task.completed ? '✓' : ''}</div>
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <span class="task-time">${task.time}</span>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', () => toggleTask(parseInt(item.dataset.id)));
        });
    }

    function toggleTask(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            updateHomeScreen();
            updateInsights();
            trackInteraction();
        }
    }

    // Focus Mode
    document.querySelectorAll('.session-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.session-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            const duration = parseInt(card.dataset.duration);
            if (duration > 0) {
                timerSeconds = duration * 60;
                timerTotal = duration * 60;
                updateTimerDisplay();
                startTimer();
                switchScreen('timer');
                document.getElementById('app-nav').style.display = 'none';
                trackInteraction();
            }
        });
    });

    function updateFocusStats() {
        document.getElementById('sessions-today').textContent = focusStats.sessionsToday;
        document.getElementById('sessions-week').textContent = focusStats.sessionsWeek;
        document.getElementById('streak-days').textContent = focusStats.streak;
    }
    updateFocusStats();

    // Timer
    function initTimer() {
        document.getElementById('pause-btn')?.addEventListener('click', () => {
            if (timerRunning) {
                pauseTimer();
                document.getElementById('pause-btn').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
            } else {
                resumeTimer();
                document.getElementById('pause-btn').innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
            }
        });

        document.getElementById('giveup-btn')?.addEventListener('click', () => {
            stopTimer();
            switchScreen('focus');
            updateNavActive('focus');
            document.getElementById('app-nav').style.display = 'flex';
        });

        document.getElementById('timer-settings-btn')?.addEventListener('click', pauseTimer);
    }

    function startTimer() {
        timerRunning = true;
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                updateTimerDisplay();
                updateTimerRing();
            } else {
                completeSession();
            }
        }, 1000);
    }

    function pauseTimer() {
        timerRunning = false;
        clearInterval(timerInterval);
    }

    function resumeTimer() {
        timerRunning = true;
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                updateTimerDisplay();
                updateTimerRing();
            } else {
                completeSession();
            }
        }, 1000);
    }

    function stopTimer() {
        pauseTimer();
        timerSeconds = 25 * 60;
        timerTotal = 25 * 60;
        updateTimerDisplay();
        updateTimerRing();
    }

    function completeSession() {
        pauseTimer();
        focusStats.sessionsToday++;
        focusStats.sessionsWeek++;
        updateFocusStats();
        updateInsights();

        timerSeconds = 25 * 60;
        timerTotal = 25 * 60;
        updateTimerDisplay();
        switchScreen('home');
        updateNavActive('home');
        document.getElementById('app-nav').style.display = 'flex';

        addBotMessage("🎉 Amazing focus session! You stayed concentrated the whole time. Keep it up!");
    }

    function updateTimerDisplay() {
        const min = Math.floor(timerSeconds / 60);
        const sec = timerSeconds % 60;
        document.getElementById('timer-min').textContent = String(min).padStart(2, '0');
        document.getElementById('timer-sec').textContent = String(sec).padStart(2, '0');
    }

    function updateTimerRing() {
        const ring = document.getElementById('timer-ring-fill');
        if (ring) {
            const circumference = 2 * Math.PI * 85;
            const progress = timerSeconds / timerTotal;
            ring.style.strokeDasharray = circumference;
            ring.style.strokeDashoffset = circumference * (1 - progress);
        }
    }

    // Chat
    function initChat() {
        document.getElementById('send-btn')?.addEventListener('click', sendMessage);
        document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    async function sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (!message) return;

        addUserMessage(message);
        input.value = '';
        trackInteraction();

        showTypingIndicator();

        try {
            const response = await getAIResponse(message);
            hideTypingIndicator();
            addBotMessage(response);
        } catch (error) {
            hideTypingIndicator();
            addBotMessage(getFallbackResponse(message));
        }
    }

    function addUserMessage(text) {
        const container = document.getElementById('chat-container');
        const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        container.innerHTML += `
            <div class="chat-msg user">
                <div class="msg-content">
                    <p>${escapeHtml(text)}</p>
                    <span class="msg-time">${time}</span>
                </div>
            </div>
        `;
        container.scrollTop = container.scrollHeight;
        chatHistory.push({ role: 'user', content: text });
    }

    function addBotMessage(text) {
        const container = document.getElementById('chat-container');
        const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        container.innerHTML += `
            <div class="chat-msg bot">
                <div class="msg-avatar">🤖</div>
                <div class="msg-content">
                    <p>${text}</p>
                    <span class="msg-time">${time}</span>
                </div>
            </div>
        `;
        container.scrollTop = container.scrollHeight;
        chatHistory.push({ role: 'assistant', content: text });
    }

    function showTypingIndicator() {
        const container = document.getElementById('chat-container');
        container.innerHTML += `
            <div class="chat-msg bot typing-msg">
                <div class="msg-avatar">🤖</div>
                <div class="msg-content">
                    <div class="typing-indicator"><span></span><span></span><span></span></div>
                </div>
            </div>
        `;
        container.scrollTop = container.scrollHeight;
    }

    function hideTypingIndicator() {
        document.querySelector('.typing-msg')?.remove();
    }

    async function getAIResponse(userMessage) {
        const apiKey = window.MISTRAL_API_KEY;
        if (!apiKey || apiKey === 'YOUR_MISTRAL_API_KEY_HERE') {
            return getFallbackResponse(userMessage);
        }

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...chatHistory.slice(-6),
            { role: 'user', content: userMessage }
        ];

        const response = await fetch(MISTRAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages: messages,
                max_tokens: 150,
                temperature: 0.7
            })
        });

        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        return data.choices[0].message.content;
    }

    function getFallbackResponse(message) {
        const m = message.toLowerCase();
        if (m.includes('plan') || m.includes('day')) return "📋 Great idea! Start with your most important task when energy is highest. Use Focus Mode for 25-minute deep work sessions. Want me to help prioritize?";
        if (m.includes('task')) return `📝 You have ${tasks.length} tasks. ${tasks.filter(t => t.completed).length} done! Try the Eisenhower Matrix to prioritize by urgency and importance.`;
        if (m.includes('focus')) return "🎯 Ready to focus? Head to Focus Mode and try a Pomodoro session. I'll help you stay on track! 💪";
        if (m.includes('hello') || m.includes('hi')) return "Hey! 👋 I'm your productivity assistant. I can help plan your day, suggest focus sessions, or give tips. What's on your mind?";
        if (m.includes('pomodoro')) return "🍅 Pomodoro: 25min work, 5min break. After 4 sessions, take a longer break. Head to Focus Mode to start!";
        return "💡 I'm here to help with planning, focus, and motivation! Try 'plan my day' or 'start focus session'. For full features, download the app!";
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Calendar
    function initCalendar() {
        const strip = document.getElementById('calendar-strip');
        if (!strip) return;

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        let html = '';

        for (let i = -2; i <= 4; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const isToday = i === 0;
            html += `
                <div class="cal-day ${isToday ? 'active' : ''}">
                    <span class="cal-day-name">${days[date.getDay()]}</span>
                    <span class="cal-day-num">${date.getDate()}</span>
                </div>
            `;
        }
        strip.innerHTML = html;

        strip.querySelectorAll('.cal-day').forEach(day => {
            day.addEventListener('click', () => {
                strip.querySelectorAll('.cal-day').forEach(d => d.classList.remove('active'));
                day.classList.add('active');
            });
        });
    }

    // Insights
    function updateInsights() {
        const completed = tasks.filter(t => t.completed).length;
        document.getElementById('focus-hours').textContent = focusStats.sessionsWeek;
        document.getElementById('tasks-completed-insight').textContent = completed;
        document.getElementById('current-streak').textContent = focusStats.streak;

        const focusBar = document.querySelector('.insight-card .bar-fill');
        if (focusBar) focusBar.style.width = `${(focusStats.sessionsWeek / 20) * 100}%`;

        const taskBar = document.querySelectorAll('.insight-card .bar-fill')[1];
        if (taskBar) taskBar.style.width = `${(completed / Math.max(tasks.length, 1)) * 100}%`;
    }

    // Modals
    function initModals() {
        const downloadModal = document.getElementById('download-modal');
        const taskModal = document.getElementById('add-task-modal');

        document.getElementById('modal-close')?.addEventListener('click', () => downloadModal.classList.remove('active'));
        document.getElementById('modal-dismiss')?.addEventListener('click', () => downloadModal.classList.remove('active'));
        downloadModal?.querySelector('.modal-overlay')?.addEventListener('click', () => downloadModal.classList.remove('active'));

        document.getElementById('task-cancel')?.addEventListener('click', () => taskModal.classList.remove('active'));
        taskModal?.querySelector('.modal-overlay')?.addEventListener('click', () => taskModal.classList.remove('active'));

        document.getElementById('task-confirm')?.addEventListener('click', () => {
            const name = document.getElementById('new-task-input').value.trim();
            if (name) {
                const timeValue = document.getElementById('new-task-time').value;
                const [hours, minutes] = timeValue.split(':');
                const period = hours >= 12 ? 'PM' : 'AM';
                const displayHours = hours % 12 || 12;

                tasks.push({
                    id: Date.now(),
                    name: name,
                    time: `${displayHours}:${minutes} ${period}`,
                    completed: false
                });

                updateHomeScreen();
                updateInsights();
                taskModal.classList.remove('active');
            }
        });

        document.getElementById('new-task-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('task-confirm').click();
        });
    }

    function trackInteraction() {
        interactionCount++;
        if (interactionCount === 5) {
            setTimeout(() => document.getElementById('download-modal').classList.add('active'), 500);
        }
    }

    // Stats Animation
    const statsObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            document.querySelectorAll('.stat-number').forEach(stat => {
                const text = stat.textContent;
                const num = parseFloat(text.replace(/[^0-9.]/g, ''));
                const suffix = text.replace(/[0-9.]/g, '');
                animateValue(stat, 0, num, 2000, suffix);
            });
            statsObserver.disconnect();
        }
    }, { threshold: 0.5 });

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) statsObserver.observe(heroStats);

    function animateValue(el, start, end, duration, suffix) {
        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + (end - start) * easeOut;
            el.textContent = (suffix.includes('.') ? current.toFixed(1) : Math.floor(current)) + suffix.replace('.', '');
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    // Sticky Showcase Management
    function initStickyShowcase() {
        const items = document.querySelectorAll('.showcase-item');
        if (items.length === 0) return;

        const observerOptions = {
            threshold: 0.6,
            rootMargin: '0px'
        };

        const showcaseObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const step = entry.target.dataset.step;
                    // Activate items across both sides for same step
                    document.querySelectorAll(`.showcase-item[data-step="${step}"]`).forEach(el => {
                        el.classList.add('active');
                    });

                    // Optional: Change phone screen based on step
                    if (step === "1") switchScreen('home');
                    if (step === "2") switchScreen('focus');
                    if (step === "3") switchScreen('matrix');
                } else {
                    const step = entry.target.dataset.step;
                    // Deactivate items when they leave
                    // Note: In some designs we only deactivate if scrolling backwards, 
                    // but for a clean feel we'll manage strictly
                    entry.target.classList.remove('active');
                }
            });
        }, observerOptions);

        items.forEach(item => showcaseObserver.observe(item));
    }

    initStickyShowcase();
});
