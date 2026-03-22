// Main Application Class - Clean Refactored Version
class SabaiBookingBoard {
    constructor() {
        console.log('🚀 SabaiBookingBoard constructor started...');
        
        // Core state
        this.currentDate = new Date();
        this.therapists = [];
        this.bookings = [];
        this.timeSlots = [];
        this.services = [];
        this.isLoading = false;
        
        console.log('📅 Initial date:', this.currentDate);
        
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
        
        console.log('✅ All required modules found');
        
        // Initialize modules
        try {
            this.dataService = new SabaiDataService();
            console.log('✅ DataService initialized');
            
            this.calendarRenderer = new SabaiCalendarRenderer(this.dataService, this);
            console.log('✅ CalendarRenderer initialized');
            
            this.bookingManager = new SabaiBookingManager(this.dataService, this.calendarRenderer, this);
            console.log('✅ BookingManager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize modules:', error);
            this.showError('ไม่สามารถเริ่มต้นระบบได้: ' + error.message);
            return;
        }
        
        // Initialize application
        this.initializeTimeSlots();
        this.bindEvents();
        this.loadInitialData();
        
        // Add cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        console.log('🎉 SabaiBookingBoard initialization complete');
    }
    
    // Cleanup method to prevent memory leaks
    cleanup() {
        console.log('🧹 App cleanup started...');
        
        if (this.calendarRenderer) {
            this.calendarRenderer.cleanup();
        }
        
        if (this.dataService) {
            this.dataService.cleanup();
        }
        
        console.log('✅ App cleanup completed');
    }

    // Initialize time slots based on shop hours
    initializeTimeSlots() {
        this.timeSlots = [];
        const start = CONFIG.SHOP_START_HOUR;
        const end = CONFIG.SHOP_END_HOUR;
        
        console.log('🕐 App: Initializing time slots:', { start, end });
        
        for (let hour = start; hour <= end; hour++) {
            for (let minute = 0; minute < 60; minute += CONFIG.SLOT_DURATION) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                this.timeSlots.push(timeString);
                console.log('➕ App: Added time slot:', timeString);
            }
        }
        
        console.log('✅ App: Final time slots:', this.timeSlots);
        console.log('⏰ App: Last slot:', this.timeSlots[this.timeSlots.length - 1]);
        console.log('📊 App: Total slots:', this.timeSlots.length);
    }

    // Bind event listeners
    bindEvents() {
        // Date navigation
        document.getElementById('prevDay').addEventListener('click', () => this.changeDate(-1));
        document.getElementById('nextDay').addEventListener('click', () => this.changeDate(1));

        // Settings navigation
        document.getElementById('settingsBtn').addEventListener('click', (e) => {
            console.log('Settings button clicked - navigating to settings page');
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'settings.html';
        });
        
        // Calendar capture
        document.getElementById('captureBtn').addEventListener('click', () => {
            this.calendarRenderer.captureCalendar(this.currentDate);
        });

        // Initialize booking modal handlers
        this.bookingManager.initializeBookingModal();

        // Error retry button
        const retryButton = document.getElementById('retryButton');
        if (retryButton) {
            retryButton.addEventListener('click', () => this.loadInitialData());
        }
    }

    // Load initial data with real-time listeners
    async loadInitialData() {
        try {
            console.log('📊 Starting to load initial data with real-time listeners...');
            this.showLoading();
            
            console.log('🔄 Setting up real-time listeners for therapists and services...');
            
            // Setup real-time listeners
            this.setupRealTimeListeners();
            
            // Load services (static for now as they don't change often)
            await this.loadServices();
            
            console.log('✅ Real-time listeners set up successfully');
            
        } catch (error) {
            console.error('❌ Error setting up real-time listeners:', error);
            this.showError('ไม่สามารถเชื่อมต่อระบบแบบ Real-time ได้ กรุณาลองใหม่อีกครั้ง');
        }
    }
    
    // Setup all real-time listeners
    setupRealTimeListeners() {
        // Setup therapist real-time listener
        this.dataService.setupTherapistsRealTimeListener((therapists) => {
            console.log('📡 Received real-time therapist update');
            this.therapists = therapists;
            this.renderCalendarIfReady();
        });
        
        // Setup booking real-time listener for current date
        this.dataService.setupBookingsRealTimeListener(this.currentDate, (bookings) => {
            console.log('📡 Received real-time booking update');
            this.bookings = bookings;
            this.renderCalendarIfReady();
        });
    }
    
    // Render calendar only if all data is ready
    renderCalendarIfReady() {
        if (this.therapists && this.therapists.length > 0) {
            console.log('🎨 Rendering calendar with real-time data...');
            this.renderCalendar();
            this.hideLoading();
        }
    }

    // Load data methods - now using dataService
    async loadTherapists() {
        try {
            console.log('👨‍⚕️ Loading therapists...');
            this.therapists = await this.dataService.getTherapists();
            console.log('✅ Therapists loaded:', this.therapists.length, 'items');
            console.log('👨‍⚕️ Therapists data:', this.therapists);
        } catch (error) {
            console.error('❌ Error loading therapists:', error);
            throw error;
        }
    }

    async loadBookings() {
        try {
            console.log('📅 Loading bookings for date:', this.currentDate);
            this.bookings = await this.dataService.getBookingsByDate(this.currentDate);
            console.log('✅ Bookings loaded:', this.bookings.length, 'items');
            console.log('📅 Bookings data:', this.bookings);
        } catch (error) {
            console.error('❌ Error loading bookings:', error);
            throw error;
        }
    }

    async loadServices() {
        try {
            console.log('🛠️ Loading services...');
            this.services = await this.dataService.getServices();
            console.log('✅ Services loaded:', this.services.length, 'items');
            console.log('🛠️ Services data:', this.services);
        } catch (error) {
            console.error('❌ Error loading services:', error);
            // Don't throw error to prevent blocking app initialization
        }
    }

    // Date navigation with real-time listener
    changeDate(delta) {
        this.currentDate.setDate(this.currentDate.getDate() + delta);
        console.log('📅 Date changed to:', this.currentDate);
        
        // Setup new real-time listener for the new date
        this.dataService.setupBookingsRealTimeListener(this.currentDate, (bookings) => {
            console.log('📡 Received booking update for new date');
            this.bookings = bookings;
            this.renderCalendar();
        });
        
        // Render immediately with current data (may be empty for new date)
        this.renderCalendar();
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