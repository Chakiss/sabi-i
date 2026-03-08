class SabaiBookingBoard {
    constructor() {
        this.currentDate = new Date();
        this.therapists = [];
        this.bookings = [];
        this.timeSlots = [];
        this.selectedBooking = null;
        this.isLoading = false;
        this.services = [];
        
        this.initializeTimeSlots();
        this.bindEvents();
        this.loadInitialData();
    }

    // Initialize time slots based on shop hours
    initializeTimeSlots() {
        this.timeSlots = [];
        const start = CONFIG.SHOP_START_HOUR;
        const end = CONFIG.SHOP_END_HOUR;
        
        for (let hour = start; hour <= end; hour++) {
            for (let minute = 0; minute < 60; minute += CONFIG.SLOT_DURATION) {
                // Don't add slot at closing time
                if (hour === end && minute > 0) break;
                
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                this.timeSlots.push(timeString);
            }
        }
    }

    // Bind event listeners
    bindEvents() {
        // Date navigation
        document.getElementById('prevDay').addEventListener('click', () => this.changeDate(-1));
        document.getElementById('nextDay').addEventListener('click', () => this.changeDate(1));

        // Settings button - navigate to settings page
        document.getElementById('settingsBtn').addEventListener('click', (e) => {
            console.log('Settings button clicked - navigating to settings page');
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'settings.html';
        });
        // Settings related event listeners removed - now handled in settings.js

        // Service management event listeners removed - now handled in settings.js

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBooking').addEventListener('click', () => this.closeModal());
        document.getElementById('deleteBooking').addEventListener('click', () => this.deleteBooking());
        document.getElementById('bookingForm').addEventListener('submit', (e) => this.handleBookingSubmit(e));

        // Close booking modal on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop') && 
                e.target.closest('#bookingModal')) {
                this.closeModal();
            }
        });
        
        // Settings modal backdrop listener removed - now handled in settings.js

        // Retry button
        document.getElementById('retryButton').addEventListener('click', () => this.loadInitialData());

        // Prevent form submission on enter in textarea
        document.getElementById('modalNote').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
            }
        });
    }

    // Load initial data
    async loadInitialData() {
        try {
            this.showLoading();
            
            await Promise.all([
                this.loadTherapists(),
                this.loadBookingsForDate(),
                this.loadServices()
            ]);
            
            this.renderCalendar();
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        }
    }

    // Load therapists from Firestore
    async loadTherapists() {
        try {
            const snapshot = await db.collection('therapists')
                .orderBy('displayOrder')
                .limit(CONFIG.MAX_THERAPISTS)
                .get();
                
            this.therapists = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('Loaded therapists:', this.therapists);
            
        } catch (error) {
            console.error('Error loading therapists:', error);
            throw error;
        }
    }

    // Load bookings for current date
    async loadBookingsForDate() {
        try {
            const dateKey = this.formatDateKey(this.currentDate);
            
            const snapshot = await db.collection('bookings')
                .where('dateKey', '==', dateKey)
                .get();
                
            this.bookings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('Loaded bookings for', dateKey, ':', this.bookings);
            
        } catch (error) {
            console.error('Error loading bookings:', error);
            throw error;
        }
    }

    // Load services from Firestore
    async loadServices() {
        try {
            const snapshot = await db.collection('services')
                .orderBy('displayOrder')
                .get();
                
            this.services = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('Loaded services:', this.services);
            
        } catch (error) {
            console.error('Error loading services:', error);
            // Don't throw error to prevent blocking app initialization
        }
    }

    // Format date for Firestore key
    formatDateKey(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Format date for display
    formatDisplayDate(date) {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        };
        return date.toLocaleDateString('th-TH', options);
    }

    // Show loading state
    showLoading() {
        this.isLoading = true;
        document.getElementById('loadingSpinner').classList.remove('hidden');
        document.getElementById('calendarContainer').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');
    }

    // Hide loading state
    hideLoading() {
        this.isLoading = false;
        document.getElementById('loadingSpinner').classList.add('hidden');
        document.getElementById('calendarContainer').classList.remove('hidden');
    }

    // Show error message
    showError(message) {
        this.isLoading = false;
        document.getElementById('loadingSpinner').classList.add('hidden');
        document.getElementById('calendarContainer').classList.add('hidden');
        document.getElementById('errorMessage').classList.remove('hidden');
        document.querySelector('.error-text').textContent = message;
    }

    // Change date and reload data
    async changeDate(direction) {
        if (this.isLoading) return;
        
        const newDate = new Date(this.currentDate);
        newDate.setDate(newDate.getDate() + direction);
        this.currentDate = newDate;
        
        try {
            this.showLoading();
            await this.loadBookingsForDate();
            this.renderCalendar();
            this.hideLoading();
        } catch (error) {
            console.error('Error changing date:', error);
            this.showError('ไม่สามารถโหลดข้อมูลวันที่ใหม่ได้');
        }
    }

    // Render the calendar grid
    renderCalendar() {
        this.renderDateDisplay();
        this.renderTherapistHeaders();
        this.renderCalendarGrid();
    }

    // Render current date display
    renderDateDisplay() {
        const dateElement = document.getElementById('selectedDate');
        dateElement.textContent = this.formatDisplayDate(this.currentDate);
    }

    // Render therapist headers
    renderTherapistHeaders() {
        const container = document.getElementById('therapistHeaders');
        
        // Clear existing headers except time header
        while (container.children.length > 1) {
            container.removeChild(container.lastChild);
        }

        // Get only active therapists for display
        const activeTherapists = this.therapists.filter(t => t.status === 'active');

        // Add therapist headers
        activeTherapists.forEach(therapist => {
            const header = document.createElement('div');
            header.className = 'therapist-header';
            header.textContent = therapist.name;
            container.appendChild(header);
        });

        // Update grid layout
        const columnCount = activeTherapists.length + 1; // +1 for time column
        container.style.gridTemplateColumns = `80px repeat(${activeTherapists.length}, 1fr)`;
    }

    // Render calendar grid with time slots and bookings
    renderCalendarGrid() {
        const container = document.getElementById('calendarGrid');
        container.innerHTML = '';
        
        // Get only active therapists for display
        const activeTherapists = this.therapists.filter(t => t.status === 'active');
        
        // Set grid layout
        const columnCount = activeTherapists.length + 1;
        container.style.gridTemplateColumns = `80px repeat(${activeTherapists.length}, 1fr)`;

        // Create grid cells
        this.timeSlots.forEach(timeSlot => {
            // Add time cell
            const timeCell = document.createElement('div');
            timeCell.className = 'time-cell';
            timeCell.textContent = timeSlot;
            container.appendChild(timeCell);

            // Add booking slots for each active therapist
            activeTherapists.forEach(therapist => {
                const slot = this.createBookingSlot(therapist, timeSlot);
                container.appendChild(slot);
            });
        });
    }

    // Create individual booking slot
    createBookingSlot(therapist, timeSlot) {
        const slot = document.createElement('div');
        slot.className = 'booking-slot';
        slot.dataset.therapistId = therapist.id;
        slot.dataset.timeSlot = timeSlot;

        // Check if this slot is booked
        const booking = this.findBookingForSlot(therapist.id, timeSlot);
        
        if (booking) {
            slot.classList.add('booked');
            
            // Only show booking info on the first slot of the booking
            if (this.isFirstSlotOfBooking(booking, timeSlot)) {
                const info = document.createElement('div');
                info.className = 'booking-info';
                
                // Use duration from booking data if available, otherwise calculate
                const duration = booking.duration || this.calculateDuration(booking.startTime, booking.endTime);
                const serviceName = this.getServiceName(booking.serviceId);
                
                let priceDisplay = '';
                if (booking.price) {
                    priceDisplay = `<div style="font-size: 11px; opacity: 0.7; color: #28a745;">${booking.price} บาท</div>`;
                }
                
                info.innerHTML = `
                    <div>${duration} นาที</div>
                    ${serviceName ? `<div style="font-size: 11px; opacity: 0.8;">${serviceName}</div>` : ''}
                    ${priceDisplay}
                    ${booking.note ? `<div style="font-size: 12px; opacity: 0.9;">${booking.note}</div>` : ''}
                `;
                
                slot.appendChild(info);
            }
            
            // Add click handler for editing
            slot.addEventListener('click', () => this.openEditBookingModal(booking));
        } else {
            // Add click handler for new booking
            slot.addEventListener('click', () => this.openNewBookingModal(therapist, timeSlot));
        }

        return slot;
    }

    // Find booking that occupies a specific slot
    findBookingForSlot(therapistId, timeSlot) {
        const slotTime = this.parseTimeSlot(timeSlot);
        
        return this.bookings.find(booking => {
            if (booking.therapistId !== therapistId) return false;
            
            const startTime = new Date(booking.startTime.seconds * 1000);
            const endTime = new Date(booking.endTime.seconds * 1000);
            
            return slotTime >= startTime && slotTime < endTime;
        });
    }

    // Parse time slot string to Date object
    parseTimeSlot(timeSlot) {
        const [hours, minutes] = timeSlot.split(':').map(Number);
        const date = new Date(this.currentDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    // Get service name by serviceId
    getServiceName(serviceId) {
        if (!serviceId) return null;
        const service = this.services.find(s => s.id === serviceId);
        return service ? service.name : null;
    }

    // Check if this is the first slot of a booking (for display purposes)
    isFirstSlotOfBooking(booking, timeSlot) {
        const slotTime = this.parseTimeSlot(timeSlot);
        const startTime = new Date(booking.startTime.seconds * 1000);
        
        return Math.abs(slotTime - startTime) < 60000; // Within 1 minute
    }

    // Calculate booking duration in minutes
    calculateDuration(startTime, endTime) {
        const start = new Date(startTime.seconds * 1000);
        const end = new Date(endTime.seconds * 1000);
        return Math.round((end - start) / (1000 * 60));
    }

    // Open modal for new booking
    openNewBookingModal(therapist, timeSlot) {
        this.selectedBooking = null;
        
        document.getElementById('modalTitle').textContent = 'จองเวลา';
        document.getElementById('deleteBooking').classList.add('hidden');
        
        // Populate form
        this.populateTherapistOptions();
        this.populateTimeOptions();
        this.populateServiceOptions();
        
        // Set default values
        document.getElementById('modalTherapist').value = therapist.id;
        document.getElementById('modalStartTime').value = timeSlot;
        document.getElementById('modalDuration').value = '60';
        document.getElementById('modalService').value = '';
        document.getElementById('modalNote').value = '';
        
        this.showModal();
    }

    // Open modal for editing booking
    openEditBookingModal(booking) {
        this.selectedBooking = booking;
        
        document.getElementById('modalTitle').textContent = 'แก้ไขการจอง';
        document.getElementById('deleteBooking').classList.remove('hidden');
        
        // Populate form
        this.populateTherapistOptions();
        this.populateTimeOptions();
        this.populateServiceOptions();
        
        // Set booking values
        const startTime = new Date(booking.startTime.seconds * 1000);
        const duration = booking.duration || this.calculateDuration(booking.startTime, booking.endTime);
        
        document.getElementById('modalTherapist').value = booking.therapistId;
        document.getElementById('modalStartTime').value = this.formatTimeFromDate(startTime);
        document.getElementById('modalDuration').value = duration.toString();
        document.getElementById('modalService').value = booking.serviceId || '';
        document.getElementById('modalNote').value = booking.note || '';
        
        this.showModal();
    }

    // Format time from Date object to HH:MM string
    formatTimeFromDate(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Populate therapist options in modal
    populateTherapistOptions() {
        const select = document.getElementById('modalTherapist');
        select.innerHTML = '';
        
        // Get only active therapists for booking options
        const activeTherapists = this.therapists.filter(t => t.status === 'active');
        
        activeTherapists.forEach(therapist => {
            const option = document.createElement('option');
            option.value = therapist.id;
            option.textContent = therapist.name;
            select.appendChild(option);
        });
    }

    // Populate time options in modal
    populateTimeOptions() {
        const select = document.getElementById('modalStartTime');
        select.innerHTML = '';
        
        this.timeSlots.forEach(timeSlot => {
            const option = document.createElement('option');
            option.value = timeSlot;
            option.textContent = timeSlot;
            select.appendChild(option);
        });
    }

    // Populate service options in modal
    populateServiceOptions() {
        const select = document.getElementById('modalService');
        select.innerHTML = '<option value="">ไม่ระบุบริการ</option>';
        
        // Get only active services for booking options
        const activeServices = this.services.filter(s => s.status === 'active');
        
        activeServices.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = service.name;
            select.appendChild(option);
        });
    }

    // Show modal
    showModal() {
        document.getElementById('bookingModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // Close modal
    closeModal() {
        document.getElementById('bookingModal').classList.add('hidden');
        document.body.style.overflow = '';
        this.selectedBooking = null;
    }

    // Handle booking form submission
    async handleBookingSubmit(e) {
        e.preventDefault();
        
        const formData = this.getBookingFormData();
        
        try {
            // Validate form data
            if (!this.validateBookingData(formData)) {
                return;
            }
            
            // Check for conflicts
            if (await this.checkBookingConflict(formData)) {
                alert('เวลาที่เลือกมีการจองแล้ว กรุณาเลือกเวลาอื่น');
                return;
            }
            
            // Save or update booking
            if (this.selectedBooking) {
                await this.updateBooking(formData);
            } else {
                await this.createBooking(formData);
            }
            
            // Reload and close
            await this.loadBookingsForDate();
            this.renderCalendar();
            this.closeModal();
            
        } catch (error) {
            console.error('Error saving booking:', error);
            alert('ไม่สามารถบันทึกการจองได้ กรุณาลองใหม่อีกครั้ง');
        }
    }

    // Get booking form data
    getBookingFormData() {
        const therapistId = document.getElementById('modalTherapist').value;
        const startTimeStr = document.getElementById('modalStartTime').value;
        const duration = parseInt(document.getElementById('modalDuration').value);
        const serviceId = document.getElementById('modalService').value || null;
        const note = document.getElementById('modalNote').value.trim();
        
        const startTime = this.parseTimeSlot(startTimeStr);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + duration);
        
        // Calculate price from service and duration
        let price = 0;
        if (serviceId) {
            const service = this.services.find(s => s.id === serviceId);
            if (service && service.durations) {
                const durationOption = service.durations.find(d => d.duration === duration);
                if (durationOption) {
                    price = durationOption.price;
                }
            }
        }
        
        return {
            therapistId,
            startTime,
            endTime,
            duration,
            serviceId,
            price,
            note,
            dateKey: this.formatDateKey(this.currentDate)
        };
    }

    // Validate booking data
    validateBookingData(data) {
        if (!data.therapistId || !data.startTime || !data.endTime) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return false;
        }
        
        if (data.endTime <= data.startTime) {
            alert('เวลาสิ้นสุดต้องหลังจากเวลาเริ่มต้น');
            return false;
        }
        
        // Check if booking is within shop hours
        const startHour = data.startTime.getHours();
        const endHour = data.endTime.getHours();
        const endMinutes = data.endTime.getMinutes();
        
        if (startHour < CONFIG.SHOP_START_HOUR || 
            (endHour > CONFIG.SHOP_END_HOUR) || 
            (endHour === CONFIG.SHOP_END_HOUR && endMinutes > 0)) {
            alert(`การจองต้องอยู่ ในช่วงเวลา ${CONFIG.SHOP_START_HOUR}:00 - ${CONFIG.SHOP_END_HOUR}:00`);
            return false;
        }
        
        return true;
    }

    // Check for booking conflicts
    async checkBookingConflict(newBooking) {
        const conflictingBooking = this.bookings.find(booking => {
            // Skip current booking when editing
            if (this.selectedBooking && booking.id === this.selectedBooking.id) {
                return false;
            }
            
            if (booking.therapistId !== newBooking.therapistId) {
                return false;
            }
            
            const existingStart = new Date(booking.startTime.seconds * 1000);
            const existingEnd = new Date(booking.endTime.seconds * 1000);
            
            // Check overlap: newStart < existingEnd AND newEnd > existingStart
            return newBooking.startTime < existingEnd && newBooking.endTime > existingStart;
        });
        
        return conflictingBooking !== undefined;
    }

    // Generate custom booking ID
    generateBookingId() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const date = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        
        return `B${year}${month}${date}${hours}${minutes}${seconds}`;
    }

    // Create new booking
    async createBooking(data) {
        const bookingId = this.generateBookingId();
        
        const booking = {
            therapistId: data.therapistId,
            startTime: firebase.firestore.Timestamp.fromDate(data.startTime),
            endTime: firebase.firestore.Timestamp.fromDate(data.endTime),
            dateKey: data.dateKey,
            duration: data.duration,
            price: data.price,
            serviceId: data.serviceId,
            note: data.note,
            createdAt: firebase.firestore.Timestamp.now()
        };
        
        // Remove serviceId if it's null or empty
        if (!booking.serviceId) {
            delete booking.serviceId;
        }
        
        await db.collection('bookings').doc(bookingId).set(booking);
        console.log('Created new booking with ID:', bookingId, booking);
    }

    // Update existing booking
    async updateBooking(data) {
        const booking = {
            therapistId: data.therapistId,
            startTime: firebase.firestore.Timestamp.fromDate(data.startTime),
            endTime: firebase.firestore.Timestamp.fromDate(data.endTime),
            dateKey: data.dateKey,
            duration: data.duration,
            price: data.price,
            serviceId: data.serviceId,
            note: data.note
        };
        
        // Remove serviceId if it's null or empty
        if (!booking.serviceId) {
            delete booking.serviceId;
        }
        
        await db.collection('bookings').doc(this.selectedBooking.id).update(booking);
        console.log('Updated booking:', booking);
    }

    // Delete booking
    async deleteBooking() {
        if (!this.selectedBooking) return;
        
        if (!confirm('คุณต้องการลบการจองนี้หรือไม่?')) {
            return;
        }
        
        try {
            await db.collection('bookings').doc(this.selectedBooking.id).delete();
            console.log('Deleted booking:', this.selectedBooking.id);
            
            await this.loadBookingsForDate();
            this.renderCalendar();
            this.closeModal();
            
        } catch (error) {
            console.error('Error deleting booking:', error);
            alert('ไม่สามารถลบการจองได้ กรุณาลองใหม่อีกครั้ง');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Saba-i Booking Board...');
    window.app = new SabaiBookingBoard();
});