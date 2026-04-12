// Main Application Class - Clean Refactored Version
class SabaiBookingBoard {
    constructor() {
        log('🚀 SabaiBookingBoard constructor started...');
        
        // Core state
        this.currentDate = new Date();
        this.therapists = [];
        this.bookings = [];
        this.timeSlots = [];
        this.services = [];
        this.isLoading = false;
        
        log('📅 Initial date:', this.currentDate);
        
        // Check if required dependencies are loaded
        if (typeof SabaiDataService === 'undefined') {
            console.error('❌ SabaiDataService not found! Make sure dataService.js is loaded.');
            this.showError('ไม่สามารถโหลด Data Service ได้');
            return;
        }
        
        if (typeof SabaiCalendarRenderer === 'undefined') {
            console.error('❌ SabaiCalendarRenderer not found! Make sure calendarRenderer.js is loaded.');
            this.showError('ไม่สามารถโหลด Calendar Renderer ได้');
            return;
        }
        
        if (typeof SabaiBookingManager === 'undefined') {
            console.error('❌ SabaiBookingManager not found! Make sure bookingManager.js is loaded.');
            this.showError('ไม่สามารถโหลด Booking Manager ได้');
            return;
        }
        
        if (typeof SabaiUtils === 'undefined') {
            console.error('❌ SabaiUtils not found! Make sure utils.js is loaded.');
            this.showError('ไม่สามารถโหลด Utils ได้');
            return;
        }
        
        if (typeof CONFIG === 'undefined') {
            console.error('❌ CONFIG not found! Make sure config.js is loaded.');
            this.showError('ไม่สามารถโหลด Config ได้');
            return;
        }
        
        if (typeof db === 'undefined') {
            console.error('❌ Firebase database not found! Make sure config.js is loaded and Firebase is initialized.');
            this.showError('ไม่สามารถโหลด Firebase Database ได้');
            return;
        }
        
        log('✅ All required modules found');
        
        // Initialize modules
        try {
            this.dataService = new SabaiDataService();
            log('✅ DataService initialized');
            
            this.calendarRenderer = new SabaiCalendarRenderer(this.dataService, this);
            log('✅ CalendarRenderer initialized');
            
            this.bookingManager = new SabaiBookingManager(this.dataService, this.calendarRenderer, this);
            log('✅ BookingManager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize modules:', error);
            this.showError('ไม่สามารถเริ่มต้นระบบได้: ' + error.message);
            return;
        }
        
        // Initialize application
        this.initializeTimeSlots();
        this.bindEvents();
        this.loadInitialData();

        // Display app version
        const versionEl = document.getElementById('appVersion');
        if (versionEl) versionEl.textContent = 'v' + CONFIG.APP_VERSION;

        // Initialize FCM push notifications
        this.initFCM();

        // Show PWA install banner if needed
        this.showInstallBannerIfNeeded();

        // Add cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }
    
    // Initialize FCM push notifications
    async initFCM() {
        if (typeof SabaiFCM === 'undefined') return;

        this.fcm = new SabaiFCM();
        await this.fcm.init();
        this.fcm.updateBellButton();

        // Bell button — request permission on click
        const notifyBtn = document.getElementById('notifyBtn');
        if (notifyBtn) {
            notifyBtn.addEventListener('click', async () => {
                const state = this.fcm.getPermissionState();
                if (state === 'granted' && this.fcm.currentToken) {
                    // Already enabled — offer to disable
                    if (confirm('ปิดการแจ้งเตือนบนเครื่องนี้?')) {
                        await this.fcm.removeToken();
                        this.fcm.updateBellButton();
                    }
                } else if (state === 'denied') {
                    this.fcm.showToast('การแจ้งเตือนถูกบล็อก', 'ไปที่ Settings > Safari > Notifications เพื่อเปิดใหม่');
                } else {
                    const granted = await this.fcm.requestPermission();
                    if (granted) {
                        this.fcm.showToast('สำเร็จ', 'เปิดการแจ้งเตือนแล้ว');
                    }
                    this.fcm.updateBellButton();
                }
            });
        }
    }

    // Show PWA install banner if running in Safari (not standalone PWA)
    showInstallBannerIfNeeded() {
        // Already installed as PWA — don't show
        if (window.navigator.standalone === true) return;
        if (window.matchMedia('(display-mode: standalone)').matches) return;

        // Not iOS Safari — don't show
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (!isIOS) return;

        // User already dismissed — don't show
        if (localStorage.getItem('saba_install_dismissed')) return;

        const banner = document.getElementById('installBanner');
        if (!banner) return;

        banner.style.display = 'block';

        document.getElementById('dismissInstall').addEventListener('click', () => {
            banner.style.display = 'none';
            localStorage.setItem('saba_install_dismissed', '1');
        });
    }

    // Cleanup method to prevent memory leaks
    cleanup() {
        log('🧹 App cleanup started...');
        
        if (this.calendarRenderer) {
            this.calendarRenderer.cleanup();
        }
        
        if (this.dataService) {
            this.dataService.cleanup();
        }
        
        log('✅ App cleanup completed');
    }

    // Initialize time slots based on shop hours
    initializeTimeSlots() {
        this.timeSlots = [];
        const start = CONFIG.SHOP_START_HOUR;
        const end = CONFIG.SHOP_END_HOUR;
        
        log('🕐 App: Initializing time slots:', { start, end });
        
        for (let hour = start; hour <= end; hour++) {
            for (let minute = 0; minute < 60; minute += CONFIG.SLOT_DURATION) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                this.timeSlots.push(timeString);
                log('➕ App: Added time slot:', timeString);
            }
        }
        
        log('✅ App: Final time slots:', this.timeSlots);
        log('⏰ App: Last slot:', this.timeSlots[this.timeSlots.length - 1]);
        log('📊 App: Total slots:', this.timeSlots.length);
    }

    // Bind event listeners
    bindEvents() {
        // Date navigation
        document.getElementById('prevDay').addEventListener('click', () => this.changeDate(-1));
        document.getElementById('nextDay').addEventListener('click', () => this.changeDate(1));

        // Today button
        document.getElementById('todayBtn').addEventListener('click', () => this.goToToday());

        // Settings navigation
        document.getElementById('settingsBtn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'settings.html';
        });

        // Calendar capture (lazy-loads html2canvas)
        document.getElementById('captureBtn').addEventListener('click', () => {
            this.handleCapture();
        });

        // Swipe gestures for date navigation on calendar
        this.initSwipeGestures();

        // Initialize booking modal handlers
        this.bookingManager.initializeBookingModal();

        // Error retry button
        const retryButton = document.getElementById('retryButton');
        if (retryButton) {
            retryButton.addEventListener('click', () => this.loadInitialData());
        }
    }

    // Go to today
    goToToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const current = new Date(this.currentDate);
        current.setHours(0, 0, 0, 0);

        if (current.getTime() === today.getTime()) return;

        this.currentDate = new Date();
        this._hasScrolledToNow = false; // Allow scroll to current time
        this.dataService.setupBookingsRealTimeListener(this.currentDate, (bookings) => {
            this.bookings = bookings;
            this.renderCalendar();
        });
        this.renderCalendar();
        this.updateTodayButton();
    }

    // Update today button state
    updateTodayButton() {
        const todayBtn = document.getElementById('todayBtn');
        if (!todayBtn) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const current = new Date(this.currentDate);
        current.setHours(0, 0, 0, 0);
        todayBtn.classList.toggle('is-today', current.getTime() === today.getTime());
    }

    // Lazy-load html2canvas and capture
    async handleCapture() {
        if (!window.html2canvas) {
            const captureBtn = document.getElementById('captureBtn');
            captureBtn.textContent = '⏳';
            captureBtn.disabled = true;
            try {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            } catch {
                captureBtn.textContent = '📷';
                captureBtn.disabled = false;
                alert('ไม่สามารถโหลดเครื่องมือบันทึกภาพได้');
                return;
            }
            captureBtn.textContent = '📷';
            captureBtn.disabled = false;
        }
        this.calendarRenderer.captureCalendar(this.currentDate);
    }

    // Swipe gesture support for date navigation
    initSwipeGestures() {
        const scrollArea = document.querySelector('.calendar-scroll');
        if (!scrollArea) return;

        let touchStartX = 0;
        let touchStartY = 0;
        let isSwiping = false;

        scrollArea.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isSwiping = true;
        }, { passive: true });

        scrollArea.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            // If vertical scroll is dominant, cancel swipe detection
            const dy = Math.abs(e.touches[0].clientY - touchStartY);
            const dx = Math.abs(e.touches[0].clientX - touchStartX);
            if (dy > dx) {
                isSwiping = false;
            }
        }, { passive: true });

        scrollArea.addEventListener('touchend', (e) => {
            if (!isSwiping) return;
            isSwiping = false;
            const diff = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(diff) > 80) {
                this.changeDate(diff > 0 ? -1 : 1);
            }
        }, { passive: true });
    }

    // Load initial data with real-time listeners
    async loadInitialData() {
        try {
            log('📊 Starting to load initial data with real-time listeners...');
            this.showLoading();
            
            // Load services first so they're available when calendar first renders
            await this.loadServices();

            log('🔄 Setting up real-time listeners for therapists and services...');

            // Setup real-time listeners after services are ready
            this.setupRealTimeListeners();
            
            log('✅ Real-time listeners set up successfully');
            
        } catch (error) {
            console.error('❌ Error setting up real-time listeners:', error);
            this.showError('ไม่สามารถเชื่อมต่อระบบแบบ Real-time ได้ กรุณาลองใหม่อีกครั้ง');
        }
    }
    
    // Setup all real-time listeners
    setupRealTimeListeners() {
        // Setup therapist real-time listener
        this.dataService.setupTherapistsRealTimeListener((therapists) => {
            log('📡 Received real-time therapist update');
            this.therapists = therapists;
            this.renderCalendarIfReady();
        });
        
        // Setup booking real-time listener for current date
        this.dataService.setupBookingsRealTimeListener(this.currentDate, (bookings) => {
            log('📡 Received real-time booking update');
            this.bookings = bookings;
            this.renderCalendarIfReady();
        });
    }
    
    // Render calendar only if all data is ready (debounced to prevent double renders)
    renderCalendarIfReady() {
        clearTimeout(this._renderTimer);
        this._renderTimer = setTimeout(() => {
            if (this.therapists && this.therapists.length > 0) {
                this.renderCalendar();
                this.hideLoading();
                this.updateTodayButton();
            }
        }, 50);
    }

    // Load data methods - now using dataService
    async loadTherapists() {
        try {
            log('👨‍⚕️ Loading therapists...');
            this.therapists = await this.dataService.getTherapists();
            log('✅ Therapists loaded:', this.therapists.length, 'items');
            log('👨‍⚕️ Therapists data:', this.therapists);
        } catch (error) {
            console.error('❌ Error loading therapists:', error);
            throw error;
        }
    }

    async loadBookings() {
        try {
            log('📅 Loading bookings for date:', this.currentDate);
            this.bookings = await this.dataService.getBookingsByDate(this.currentDate);
            log('✅ Bookings loaded:', this.bookings.length, 'items');
            log('📅 Bookings data:', this.bookings);
        } catch (error) {
            console.error('❌ Error loading bookings:', error);
            throw error;
        }
    }

    async loadServices() {
        try {
            log('🛠️ Loading services...');
            this.services = await this.dataService.getServices();
            log('✅ Services loaded:', this.services.length, 'items');
            log('🛠️ Services data:', this.services);
        } catch (error) {
            console.error('❌ Error loading services:', error);
            // Don't throw error to prevent blocking app initialization
        }
    }

    // Date navigation with real-time listener
    changeDate(delta) {
        this.currentDate.setDate(this.currentDate.getDate() + delta);
        this._hasScrolledToNow = false; // Allow scroll to current time if navigating to today

        // Setup new real-time listener for the new date
        this.dataService.setupBookingsRealTimeListener(this.currentDate, (bookings) => {
            this.bookings = bookings;
            this.renderCalendar();
        });

        // Render immediately with current data (may be empty for new date)
        this.renderCalendar();
        this.updateTodayButton();
    }

    // Render calendar using calendarRenderer
    renderCalendar() {
        this.calendarRenderer.renderCalendar(
            this.therapists,
            this.bookings,
            this.services,
            this.timeSlots,
            this.currentDate
        );

        // Auto-scroll to current time on first render of today
        if (!this._hasScrolledToNow) {
            this._hasScrolledToNow = true;
            this.scrollToCurrentTime();
        }
    }

    // Scroll calendar to current time slot
    scrollToCurrentTime() {
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentDateStart = new Date(this.currentDate);
        currentDateStart.setHours(0, 0, 0, 0);

        // Only scroll if viewing today
        if (currentDateStart.getTime() !== today.getTime()) return;

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        if (currentHour < CONFIG.SHOP_START_HOUR || currentHour > CONFIG.SHOP_END_HOUR) return;

        const slotIndex = Math.floor((currentHour - CONFIG.SHOP_START_HOUR) * (60 / CONFIG.SLOT_DURATION) + currentMinute / CONFIG.SLOT_DURATION);
        // Scroll a few slots before current time for context
        const scrollToIndex = Math.max(0, slotIndex - 2);

        const container = document.getElementById('calendarWithHeaders');
        if (!container) return;

        const activeTherapists = this.therapists.filter(t => t.status === 'active');
        const cellsPerRow = activeTherapists.length + 1;
        const targetCellIndex = (scrollToIndex + 1) * cellsPerRow; // +1 for header row
        const targetRow = container.children[targetCellIndex];

        if (targetRow) {
            setTimeout(() => {
                targetRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        }
    }

    // Public methods for opening booking modals - used by calendarRenderer event handlers
    openNewBookingModal(therapist, timeSlot) {
        this.bookingManager.openNewBookingModal(therapist, timeSlot);
    }

    openEditBookingModal(booking) {
        this.bookingManager.openEditBookingModal(booking);
    }

    // UI state management
    showLoading() {
        this.isLoading = true;
        const loading = document.getElementById('loadingSpinner');
        const calendar = document.getElementById('calendarContainer');
        const error = document.getElementById('errorMessage');
        
        if (loading) loading.classList.remove('hidden');
        if (calendar) calendar.classList.add('hidden');
        if (error) error.classList.add('hidden');
    }

    hideLoading() {
        this.isLoading = false;
        const loading = document.getElementById('loadingSpinner');
        const calendar = document.getElementById('calendarContainer');
        
        if (loading) loading.classList.add('hidden');
        if (calendar) calendar.classList.remove('hidden');
    }

    showError(message) {
        this.isLoading = false;
        const loading = document.getElementById('loadingSpinner');
        const calendar = document.getElementById('calendarContainer');
        const error = document.getElementById('errorMessage');
        const errorText = document.querySelector('.error-text');
        
        if (loading) loading.classList.add('hidden');
        if (calendar) calendar.classList.add('hidden');
        if (error) error.classList.remove('hidden');
        if (errorText) errorText.textContent = message;
    }
}

// Export class for global access
window.SabaiBookingBoard = SabaiBookingBoard;