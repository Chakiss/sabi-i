// Main Application Class - Refactored to use modules
class SabaiBookingBoard {
    constructor() {
        this.currentDate = new Date();
        this.therapists = [];
        this.bookings = [];
        this.timeSlots = [];
        this.services = [];
        this.isLoading = false;
        
        // Initialize modules
        this.dataService = new SabaiDataService();
        this.calendarRenderer = new SabaiCalendarRenderer(this.dataService);
        this.bookingManager = new SabaiBookingManager(this.dataService, this.calendarRenderer);
        
        // Initialize time slots and setup
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
        
        // Capture button - screenshot calendar
        document.getElementById('captureBtn').addEventListener('click', () => {
            this.calendarRenderer.captureCalendar(this.currentDate);
        });

        // Initialize booking modal handlers
        this.bookingManager.initializeBookingModal();

        // Retry button
        const retryButton = document.getElementById('retryButton');
        if (retryButton) {
            retryButton.addEventListener('click', () => this.loadInitialData());
        }

        // Prevent form submission on enter in textarea
        const noteField = document.getElementById('note');
        if (noteField) {
            noteField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                }
            });
        }
    }

    // Load initial data
    async loadInitialData() {
        try {
            this.showLoading();
            
            await Promise.all([
                this.loadTherapists(),
                this.loadBookings(),
                this.loadServices()
            ]);
            
            this.renderCalendar();
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        }
    }
    // Load data methods - now using dataService
    async loadTherapists() {
        try {
            this.therapists = await this.dataService.getTherapists();
            console.log('Loaded therapists:', this.therapists);
        } catch (error) {
            console.error('Error loading therapists:', error);
            throw error;
        }
    }

    // Load bookings for current date
    async loadBookings() {
        try {
            this.bookings = await this.dataService.getBookingsByDate(this.currentDate);
            console.log('Loaded bookings for', SabaiUtils.formatDateKey(this.currentDate), ':', this.bookings);
        } catch (error) {
            console.error('Error loading bookings:', error);
            throw error;
        }
    }

    // Load services from Firestore
    async loadServices() {
        try {
            this.services = await this.dataService.getServices();
            console.log('Loaded services:', this.services);
        } catch (error) {
            console.error('Error loading services:', error);
            // Don't throw error to prevent blocking app initialization
        }
    }

    // Date and navigation methods
    changeDate(delta) {
        this.currentDate.setDate(this.currentDate.getDate() + delta);
        this.loadBookings().then(() => {
            this.renderCalendar();
        }).catch(error => {
            console.error('Error loading bookings for new date:', error);
            this.showError('ไม่สามารถโหลดข้อมูลสำหรับวันที่ใหม่ได้');
        });
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

    // Public methods for opening booking modals - used by event handlers
    openNewBookingModal(therapist, timeSlot) {
        this.bookingManager.openNewBookingModal(therapist, timeSlot);
    }

    openEditBookingModal(booking) {
        this.bookingManager.openEditBookingModal(booking);
    }
            slot.style.backgroundColor = bookingColor;
            
            // Add hover effect with darker shade
            slot.addEventListener('mouseenter', () => {
                slot.style.backgroundColor = `hsl(${bookingColorHue}, 60%, 50%)`;
            });
            slot.addEventListener('mouseleave', () => {
                slot.style.backgroundColor = bookingColor;
            });
            
            // Only show booking info on the first slot of the booking
            if (this.isFirstSlotOfBooking(booking, timeSlot)) {
                const info = document.createElement('div');
                info.className = 'booking-info';
                
                // Use duration from booking data if available, otherwise calculate
                const duration = booking.duration || this.calculateDuration(booking.startTime, booking.endTime);
                const serviceName = this.getServiceName(booking.serviceId);
                const paymentMethodText = this.getPaymentMethodText(booking.paymentMethod);
                
                let priceDisplay = '';
                if (booking.price) {
                    priceDisplay = `<div class="price" style="color: white">${booking.price}฿</div>`;
                }
                
                info.innerHTML = `
                    <div>${duration} นาที.</div>
                    ${serviceName ? `<div>${serviceName}</div>` : ''}
                    ${priceDisplay}
                    ${paymentMethodText ? `<div style="font-size: 11px;">${paymentMethodText}</div>` : ''}
                    ${booking.note ? `<div style="font-size: 10px; opacity: 0.9;">${booking.note}</div>` : ''}
                `;
                
                slot.appendChild(info);
            }
            // All slots in the same booking will have the same color automatically
            
            // Add click handler for editing
            slot.addEventListener('click', () => this.openEditBookingModal(booking));
        } else {
            // Empty slot styling with column and alternating row colors
            const hue = (therapistIndex * 51) % 360; // Different hue for each therapist column
            const isEvenRow = timeIndex % 2 === 0;
            const lightness = isEvenRow ? 95 : 90; // Alternate row colors
            const backgroundColor = `hsl(${hue}, 30%, ${lightness}%)`;
            slot.style.backgroundColor = backgroundColor;
            
            // Add hover effect for empty slots
            slot.addEventListener('mouseenter', () => {
                slot.style.backgroundColor = `hsl(${hue}, 40%, 85%)`;
            });
            slot.addEventListener('mouseleave', () => {
                slot.style.backgroundColor = backgroundColor;
            });
            
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
            
            // Check if slot falls within booking time range (inclusive start, exclusive end)
            // Add small buffer for time comparison precision
            const slotEnd = new Date(slotTime.getTime() + (CONFIG.SLOT_DURATION * 60 * 1000));
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

    // Check if this is the first slot of a booking (for display purposes)
    isFirstSlotOfBooking(booking, timeSlot) {
        const slotTime = this.parseTimeSlot(timeSlot);
        const startTime = new Date(booking.startTime.seconds * 1000);
        
        // Check if slot time matches start time within slot duration tolerance
        const timeDiff = Math.abs(slotTime.getTime() - startTime.getTime());
        return timeDiff < (CONFIG.SLOT_DURATION * 60 * 1000); // Within slot duration
    }

    // Get service name by serviceId
    getServiceName(serviceId) {
        if (!serviceId) return null;
        const service = this.services.find(s => s.id === serviceId);
        return service ? service.name : null;
    }

    // Get payment method text in Thai
    getPaymentMethodText(paymentMethod) {
        if (!paymentMethod) return null;
        const paymentMethods = {
            'transfer': '💳 โอน',
            'cash': '💵 สด'
        };
        return paymentMethods[paymentMethod] || null;
    }

    // Capture calendar as image and download
    async captureCalendar() {
        try {
            // Show loading state
            const captureBtn = document.getElementById('captureBtn');
            const originalText = captureBtn.textContent;
            captureBtn.textContent = '📸 กำลังบันทึก...';
            captureBtn.disabled = true;

            // Get the actual calendar grid (not the scrollable container)
            const calendarGrid = document.getElementById('calendarGrid');
            const therapistHeaders = document.getElementById('therapistHeaders');
            
            // Create a temporary container with all calendar content
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'fixed';
            tempContainer.style.top = '-9999px';
            tempContainer.style.left = '-9999px';
            tempContainer.style.background = '#ffffff';
            tempContainer.style.padding = '20px';
            tempContainer.style.fontFamily = getComputedStyle(document.body).fontFamily;
            tempContainer.style.width = 'auto';
            tempContainer.style.height = 'auto';
            
            // Clone the date display (title first)
            const dateDisplay = document.getElementById('selectedDate');
            const titleDiv = document.createElement('div');
            titleDiv.innerHTML = `<h2 style="text-align: center; margin: 0 0 20px 0; color: #1d1d1f; font-size: 24px; order: 1;">สบาย Saba-i Booking Board - ${dateDisplay.textContent}</h2>`;
            
            // Clone headers (should be second)
            const headersClone = therapistHeaders.cloneNode(true);
            headersClone.style.display = 'grid';
            headersClone.style.gridTemplateColumns = therapistHeaders.style.gridTemplateColumns;
            headersClone.style.gap = '0';
            headersClone.style.margin = '0';
            headersClone.style.marginBottom = '0';
            headersClone.style.borderBottom = '2px solid #e0e0e0';
            headersClone.style.order = '2';
            
            // Clone grid (should be third)
            const gridClone = calendarGrid.cloneNode(true);
            gridClone.style.display = 'grid';
            gridClone.style.gridTemplateColumns = calendarGrid.style.gridTemplateColumns;
            gridClone.style.gap = '0';
            gridClone.style.margin = '0';
            gridClone.style.order = '3';
            
            // Append in correct order
            tempContainer.appendChild(titleDiv);
            tempContainer.appendChild(headersClone);
            tempContainer.appendChild(gridClone);
            
            // Add to document
            document.body.appendChild(tempContainer);
            
            // Wait for layout
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Configure html2canvas options
            const options = {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                allowTaint: false,
                scrollX: 0,
                scrollY: 0,
                width: tempContainer.scrollWidth + 40,
                height: tempContainer.scrollHeight + 40
            };

            // Create canvas
            const canvas = await html2canvas(tempContainer, options);
            
            // Remove temp container
            document.body.removeChild(tempContainer);
            
            // Create download link
            const link = document.createElement('a');
            const dateStr = this.formatDateKey(this.currentDate);
            link.download = `saba-i-calendar-${dateStr}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Reset button
            captureBtn.textContent = originalText;
            captureBtn.disabled = false;
            
            console.log('Calendar captured successfully');
            
        } catch (error) {
            console.error('Error capturing calendar:', error);
            alert('ไม่สามารถบันทึกตารางได้ กรุณาลองใหม่อีกครั้ง');
            
            // Reset button on error
            const captureBtn = document.getElementById('captureBtn');
            captureBtn.textContent = '📷 บันทึกตาราง';
            captureBtn.disabled = false;
        }
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
        document.getElementById('modalPayment').value = '';
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
        document.getElementById('modalPayment').value = booking.paymentMethod || '';
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
        const paymentMethod = document.getElementById('modalPayment').value || null;
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
            paymentMethod,
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
            paymentMethod: data.paymentMethod,
            note: data.note,
            createdAt: firebase.firestore.Timestamp.now()
        };
        
        // Remove serviceId if it's null or empty
        if (!booking.serviceId) {
            delete booking.serviceId;
        }
        
        // Remove paymentMethod if it's null or empty
        if (!booking.paymentMethod) {
            delete booking.paymentMethod;
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
            paymentMethod: data.paymentMethod,
            note: data.note
        };
        
        // Remove serviceId if it's null or empty
        if (!booking.serviceId) {
            delete booking.serviceId;
        }
        
        // Remove paymentMethod if it's null or empty
        if (!booking.paymentMethod) {
            delete booking.paymentMethod;
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