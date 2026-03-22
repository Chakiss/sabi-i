// Booking Management Logic
class SabaiBookingManager {
    constructor(dataService, calendarRenderer, app) {
        this.dataService = dataService;
        this.calendarRenderer = calendarRenderer;
        this.app = app; // Store app reference
        this.editingBooking = null;
    }

    // Initialize booking modal handlers
    initializeBookingModal() {
        // Save button handler
        document.getElementById('saveBooking').addEventListener('click', () => {
            this.handleSaveBooking();
        });

        // Delete button handler
        document.getElementById('deleteBooking').addEventListener('click', () => {
            this.handleDeleteBooking();
        });

        // Cancel button handler
        document.getElementById('cancelBooking').addEventListener('click', () => {
            this.closeBookingModal();
        });

        // Modal overlay close handler
        document.getElementById('bookingModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeBookingModal();
            }
        });

        // Form submission handler
        document.getElementById('bookingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveBooking();
        });

        // Service change handler
        document.getElementById('serviceId').addEventListener('change', () => {
            this.updatePriceBasedOnService();
        });

        // Duration change handler
        document.getElementById('duration').addEventListener('change', () => {
            this.updateEndTimeBasedOnDuration();
            this.updatePriceBasedOnService();
        });

        // Start time change handler
        document.getElementById('startTime').addEventListener('change', () => {
            this.updateEndTimeBasedOnDuration();
        });

        // Price field change handler - disable auto-calculation when user manually enters price
        document.getElementById('price').addEventListener('input', () => {
            const form = document.getElementById('bookingForm');
            if (form.price.value) {
                form.price.dataset.autoCalculated = 'false';
                console.log('💰 User manually entered price, disabling auto-calculation');
            }
        });
    }

    // Populate form dropdown options
    populateFormDropdowns() {
        this.populateTherapistOptions();
        this.populateTimeSlotOptions();
        this.populateServiceOptions();
    }

    // Populate therapist options
    populateTherapistOptions() {
        const therapistSelect = document.getElementById('therapistId');
        if (!therapistSelect) return;
        
        therapistSelect.innerHTML = '<option value="">เลือกหมอนวด</option>';
        
        // Safety check - make sure app and therapists data exist
        if (!this.app || !this.app.therapists) {
            console.warn('⚠️ Therapists data not yet loaded');
            return;
        }
        
        const activeTherapists = this.app.therapists.filter(t => t.status === 'active');
        activeTherapists.forEach(therapist => {
            const option = document.createElement('option');
            option.value = therapist.id;
            option.textContent = therapist.name;
            therapistSelect.appendChild(option);
        });
    }

    // Populate time slot options
    populateTimeSlotOptions() {
        const timeSelect = document.getElementById('startTime');
        if (!timeSelect) return;
        
        timeSelect.innerHTML = '<option value="">เลือกเวลา</option>';
        
        // Safety check - make sure app and timeSlots data exist
        if (!this.app || !this.app.timeSlots) {
            console.warn('⚠️ TimeSlots data not yet loaded');
            return;
        }
        
        this.app.timeSlots.forEach(timeSlot => {
            const option = document.createElement('option');
            option.value = timeSlot;
            option.textContent = SabaiUtils.getTimeRange(timeSlot);
            timeSelect.appendChild(option);
        });
    }

    // Populate service options
    populateServiceOptions() {
        const serviceSelect = document.getElementById('serviceId');
        if (!serviceSelect) return;
        
        serviceSelect.innerHTML = '<option value="">ไม่ระบุบริการ</option>';
        
        // Safety check - make sure app and services data exist
        if (!this.app || !this.app.services) {
            console.warn('⚠️ Services data not yet loaded');
            return;
        }
        
        this.app.services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = service.name;
            serviceSelect.appendChild(option);
        });
    }

    // Open modal for new booking
    openNewBookingModal(therapist, timeSlot) {
        this.editingBooking = null;
        
        // Set modal title
        document.getElementById('modalTitle').textContent = 'เพิ่มการจอง';
        
        // Show/hide appropriate buttons
        document.getElementById('saveBooking').style.display = 'block';
        document.getElementById('deleteBooking').style.display = 'none';
        
        // Show modal first
        this.showBookingModal();
        
        // Set default values after modal is shown and DOM is ready
        setTimeout(() => {
            this.setDefaultBookingValues(therapist, timeSlot);
        }, 10);
    }

    // Open modal for editing booking
    openEditBookingModal(booking) {
        this.editingBooking = booking;
        
        // Set modal title
        document.getElementById('modalTitle').textContent = 'แก้ไขการจอง';
        
        // Show/hide appropriate buttons
        document.getElementById('saveBooking').style.display = 'block';
        document.getElementById('deleteBooking').style.display = 'block';
        
        // Show modal first to ensure DOM is ready
        this.showBookingModal();
        
        // Populate form with booking data after modal is shown and dropdowns are populated
        setTimeout(() => {
            this.populateFormWithBookingData(booking);
        }, 10);
    }

    // Set default values for new booking
    setDefaultBookingValues(therapist, timeSlot) {
        console.log('🎯 Setting default booking values for:', therapist.name, 'at', timeSlot);
        
        const form = document.getElementById('bookingForm');
        
        // Set therapist
        form.therapistId.value = therapist.id;
        
        // Set start time - ensure the value exists in the dropdown
        console.log('⏰ Setting start time to:', timeSlot);
        form.startTime.value = timeSlot;
        
        // Verify that the value was set correctly
        if (form.startTime.value !== timeSlot) {
            console.warn('⚠️ Failed to set startTime, available options:', Array.from(form.startTime.options).map(opt => opt.value));
        } else {
            console.log('✅ Start time set successfully:', form.startTime.value);
        }
        
        // Set default duration and calculate end time
        form.duration.value = '60';
        this.updateEndTimeBasedOnDuration();
        
        // Clear other fields
        form.serviceId.value = '';
        form.price.value = '';
        form.paymentMethod.value = '';
        form.note.value = '';
        
        // Auto-calculate price based on service (will be empty for new bookings)
        setTimeout(() => {
            this.updatePriceBasedOnService();
        }, 50);
        
        // Clear error message
        this.clearErrorMessage();
        
        console.log('🎯 Default booking values set successfully');
    }

    // Populate form with existing booking data
    populateFormWithBookingData(booking) {
        console.log('📊 Populating form with booking data:', booking);
        const form = document.getElementById('bookingForm');
        
        // Set therapist
        console.log('👩‍⚕️ Setting therapist ID:', booking.therapistId);
        form.therapistId.value = booking.therapistId || '';
        console.log('✅ Therapist value set to:', form.therapistId.value, 'Available options:', Array.from(form.therapistId.options).map(o => o.value));
        
        // Convert Firebase Timestamps to readable time strings
        if (booking.startTime) {
            let startTimeValue = '';
            if (booking.startTime.seconds) {
                // Firebase Timestamp object
                const startDate = new Date(booking.startTime.seconds * 1000);
                startTimeValue = SabaiUtils.formatTimeFromDate(startDate);
            } else {
                // Regular string
                startTimeValue = booking.startTime;
            }
            console.log('⏰ Setting start time to:', startTimeValue);
            form.startTime.value = startTimeValue;
            console.log('✅ Start time value set to:', form.startTime.value, 'Available options:', Array.from(form.startTime.options).map(o => o.value));
        } else {
            form.startTime.value = '';
        }
        
        // Set end time
        if (booking.endTime) {
            let endTimeValue = '';
            if (booking.endTime.seconds) {
                // Firebase Timestamp object
                const endDate = new Date(booking.endTime.seconds * 1000);
                endTimeValue = SabaiUtils.formatTimeFromDate(endDate);
            } else {
                // Regular string
                endTimeValue = booking.endTime;
            }
            form.endTime.value = endTimeValue;
        } else {
            form.endTime.value = '';
        }
        
        // Set other form values
        form.duration.value = booking.duration || '60';
        form.serviceId.value = booking.serviceId || '';
        form.price.value = booking.price || '';
        form.paymentMethod.value = booking.paymentMethod || '';
        form.note.value = booking.note || '';
        
        // Update price based on service after setting values
        setTimeout(() => {
            this.updatePriceBasedOnService();
        }, 50);
        
        console.log('📊 Form populated with booking data successfully');
        this.clearErrorMessage();
    }

    // Update end time based on duration
    updateEndTimeBasedOnDuration() {
        const startTimeElement = document.getElementById('startTime');
        const durationElement = document.getElementById('duration');
        const endTimeElement = document.getElementById('endTime');
        
        const startTime = startTimeElement.value;
        const duration = parseInt(durationElement.value);
        
        if (startTime && duration) {
            const endTime = SabaiUtils.addMinutes(startTime, duration);
            endTimeElement.value = endTime;
        }
    }

    // Show booking modal
    showBookingModal() {
        // Refresh form dropdowns in case data changed
        this.populateFormDropdowns();
        document.getElementById('bookingModalOverlay').style.display = 'flex';
    }

    // Close booking modal
    closeBookingModal() {
        document.getElementById('bookingModalOverlay').style.display = 'none';
        this.editingBooking = null;
    }

    // Handle save booking
    async handleSaveBooking() {
        try {
            console.log('💾 Starting booking save process...');
            const bookingData = this.getBookingDataFromForm();
            console.log('📊 Booking data from form:', bookingData);
            
            // Validate booking data
            const validationResult = SabaiUtils.validateBookingData(bookingData);
            console.log('✅ Validation result:', validationResult);
            if (!validationResult.isValid) {
                this.showErrorMessage(validationResult.message);
                return;
            }
            
            // Check for conflicts
            console.log('🔍 Checking for conflicts...');
            const hasConflict = await this.checkBookingConflict(bookingData, this.editingBooking?.id);
            console.log('⚡ Conflict check result:', hasConflict);
            if (hasConflict) {
                const timeRange = `${bookingData.startTime.getHours().toString().padStart(2,'0')}:${bookingData.startTime.getMinutes().toString().padStart(2,'0')} - ${bookingData.endTime.getHours().toString().padStart(2,'0')}:${bookingData.endTime.getMinutes().toString().padStart(2,'0')}`;
                console.log('❌ Showing conflict message for time range:', timeRange);
                this.showErrorMessage(`มีการจองในช่วงเวลา ${timeRange} แล้ว กรุณาเลือกเวลาอื่น`);
                return;
            }
            
            // Save booking
            if (this.editingBooking) {
                await this.updateBooking(bookingData);
            } else {
                await this.createBooking(bookingData);
            }
            
            this.closeBookingModal();
            
        } catch (error) {
            console.error('Error saving booking:', error);
            this.showErrorMessage('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง');
        }
    }

    // Handle delete booking
    async handleDeleteBooking() {
        if (!this.editingBooking) return;
        
        if (confirm('ต้องการลบการจองนี้หรือไม่?')) {
            try {
                await this.dataService.deleteBooking(this.editingBooking.id);
                this.closeBookingModal();
                await this.app.loadBookings();
                this.app.renderCalendar();
                console.log('Booking deleted successfully');
                
            } catch (error) {
                console.error('Error deleting booking:', error);
                this.showErrorMessage('เกิดข้อผิดพลาดในการลบ กรุณาลองใหม่อีกครั้ง');
            }
        }
    }

    // Get booking data from form
    getBookingDataFromForm() {
        const form = document.getElementById('bookingForm');
        const currentDate = new Date(this.app.currentDate);
        
        // Helper function to convert time string to Date object
        const createDateTime = (timeString) => {
            if (!timeString) return null;
            const [hours, minutes] = timeString.split(':').map(Number);
            const date = new Date(currentDate);
            date.setHours(hours, minutes, 0, 0);
            return date;
        };
        
        return {
            therapistId: form.therapistId.value,
            dateKey: SabaiUtils.formatDateKey(currentDate),
            startTime: createDateTime(form.startTime.value),
            endTime: createDateTime(form.endTime.value),
            duration: parseInt(form.duration.value),
            serviceId: form.serviceId.value,
            price: form.price.value ? parseFloat(form.price.value) : null,
            paymentMethod: form.paymentMethod.value,
            note: form.note.value,
            timestamp: new Date()
        };
    }

    // Check for booking conflicts
    async checkBookingConflict(bookingData, excludeBookingId = null) {
        const bookings = this.app.bookings;
        console.log('🗓️ Current bookings:', bookings?.length || 0, 'bookings loaded');
        
        if (!bookings || bookings.length === 0) {
            console.log('✅ No existing bookings, no conflicts possible');
            return false;
        }
        
        // Create newBooking object with therapistId and Date objects for comparison
        const newBooking = {
            therapistId: bookingData.therapistId,
            startTime: bookingData.startTime,
            endTime: bookingData.endTime
        };
        
        console.log('🆚 Checking new booking against existing bookings:', newBooking);
        
        return this.dataService.checkBookingConflict(
            bookings,
            newBooking,
            excludeBookingId
        );
    }

    // Create new booking
    async createBooking(bookingData) {
        const bookingId = await this.dataService.createBooking(bookingData);
        console.log('Booking created with ID:', bookingId);
        
        // Reload data and render
        await this.app.loadBookings();
        this.app.renderCalendar();
    }

    // Update existing booking
    async updateBooking(bookingData) {
        await this.dataService.updateBooking(this.editingBooking.id, bookingData);
        console.log('Booking updated successfully');
        
        // Reload data and render
        await this.app.loadBookings();
        this.app.renderCalendar();
    }

    // Show error message
    showErrorMessage(message) {
        console.log('🚨 Showing error message:', message);
        
        // Prevent multiple alerts within short timeframe
        const now = Date.now();
        if (this.lastAlertTime && (now - this.lastAlertTime) < 1000) {
            console.log('🚫 Preventing duplicate alert within 1 second');
            return;
        }
        this.lastAlertTime = now;
        
        // Check if we're in modal context - look for modal error message first
        const modalOverlay = document.getElementById('bookingModalOverlay');
        console.log('🔍 Modal overlay found:', modalOverlay);
        console.log('🔍 Modal display style:', modalOverlay?.style.display);
        console.log('🔍 Modal computed display:', modalOverlay ? getComputedStyle(modalOverlay).display : 'no modal');
        
        const isModalOpen = modalOverlay && getComputedStyle(modalOverlay).display !== 'none';
        console.log('🎭 Is modal open?', isModalOpen);
        
        let errorElement = null;
        if (isModalOpen) {
            // Try multiple ways to find error element inside the modal
            console.log('🔍 Searching for error element in modal...');
            
            // Method 1: Direct ID search within modal
            errorElement = modalOverlay.querySelector('#errorMessage');
            console.log('🎯 Method 1 - Direct ID search:', errorElement);
            
            // Method 2: If not found, try class selector
            if (!errorElement) {
                errorElement = modalOverlay.querySelector('.error-message');
                console.log('🎯 Method 2 - Class search:', errorElement);
            }
            
            // Method 3: Find all error elements and pick first
            if (!errorElement) {
                const allErrorElements = modalOverlay.querySelectorAll('[id="errorMessage"], .error-message');
                console.log('🔍 All error elements in modal:', allErrorElements);
                errorElement = allErrorElements[0];
                console.log('🎯 Method 3 - First from all:', errorElement);
            }
        } else {
            // Use main page error element
            errorElement = document.querySelector('body > #errorMessage, .error-message:not(.modal *)');
            console.log('🎯 Using main page error element:', errorElement);
        }
        
        if (errorElement) {
            console.log('📝 Setting error text and showing element');
            console.log('🔍 Element before styling:', {
                display: errorElement.style.display,
                visibility: errorElement.style.visibility,
                textContent: errorElement.textContent
            });
            
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            errorElement.style.visibility = 'visible';
            errorElement.style.backgroundColor = '#fee';
            errorElement.style.border = '1px solid #f00';
            errorElement.style.padding = '10px';
            errorElement.style.borderRadius = '4px';
            errorElement.style.marginBottom = '10px';
            errorElement.style.fontSize = '14px';
            errorElement.style.fontWeight = 'bold';
            errorElement.style.position = 'relative';
            errorElement.style.zIndex = '9999';
            errorElement.style.width = '100%';
            errorElement.style.boxSizing = 'border-box';
            
            console.log('✅ Error message set successfully, final state:', {
                text: errorElement.textContent,
                display: errorElement.style.display,
                visibility: errorElement.style.visibility,
                backgroundColor: errorElement.style.backgroundColor
            });
            
            // Show alert as backup
            setTimeout(() => {
                alert(message);
            }, 50);
        } else {
            console.log('⚠️ Error element not found anywhere, using alert fallback');
            alert(message);
        }
    }

    // Clear error message
    clearErrorMessage() {
        console.log('🧹 Clearing error messages');
        
        // Clear both modal and main page error messages
        const modalOverlay = document.getElementById('bookingModalOverlay');
        if (modalOverlay) {
            const modalErrorElement = modalOverlay.querySelector('#errorMessage');
            if (modalErrorElement) {
                modalErrorElement.style.display = 'none';
                modalErrorElement.textContent = '';
                console.log('🧹 Modal error message cleared');
            }
        }
        
        const mainErrorElement = document.getElementById('errorMessage');
        if (mainErrorElement) {
            mainErrorElement.style.display = 'none';
            mainErrorElement.textContent = '';
            console.log('🧹 Main page error message cleared');
        }
    }
    // Update price based on selected service and duration
    updatePriceBasedOnService() {
        const form = document.getElementById('bookingForm');
        const serviceId = form.serviceId.value;
        const duration = parseInt(form.duration.value);
        
        console.log('💰 Updating price for service:', serviceId, 'duration:', duration);
        
        // Only auto-fill if price field is empty or contains previously calculated value
        if (!form.price.value || form.price.dataset.autoCalculated === 'true') {
            if (serviceId && duration && this.app && this.app.services) {
                const service = this.app.services.find(s => s.id === serviceId);
                if (service && service.durations) {
                    const durationOption = service.durations.find(d => d.duration === duration);
                    if (durationOption && durationOption.price) {
                        form.price.value = durationOption.price;
                        form.price.dataset.autoCalculated = 'true';
                        console.log('💰 Auto-calculated price:', durationOption.price, '฿');
                        return;
                    }
                }
            }
            
            // Clear auto-calculated price if no service/duration match
            if (form.price.dataset.autoCalculated === 'true') {
                form.price.value = '';
                form.price.dataset.autoCalculated = 'false';
                console.log('💰 Cleared auto-calculated price');
            }
        }
        
        console.log('💰 Price update complete');
    }
    // Filter bookings by date
    filterBookingsByDate(bookings, date) {
        const dateKey = SabaiUtils.formatDateKey(date);
        return bookings.filter(booking => booking.date === dateKey);
    }

    // Get booking statistics for current date
    getBookingStatistics(bookings, date) {
        const dateBookings = this.filterBookingsByDate(bookings, date);
        
        const stats = {
            totalBookings: dateBookings.length,
            totalDuration: dateBookings.reduce((sum, booking) => {
                return sum + (booking.duration || 0);
            }, 0),
            totalRevenue: dateBookings.reduce((sum, booking) => {
                return sum + (booking.price || 0);
            }, 0),
            paymentMethods: {}
        };

        // Count payment methods
        dateBookings.forEach(booking => {
            if (booking.paymentMethod) {
                const method = SabaiUtils.getPaymentMethodText(booking.paymentMethod);
                stats.paymentMethods[method] = (stats.paymentMethods[method] || 0) + 1;
            }
        });

        return stats;
    }

    // Validate booking time slots
    validateBookingTimeSlots(startTime, endTime) {
        const timeSlots = this.app.timeSlots;
        
        // Check if start and end times are valid slots
        const isValidStart = timeSlots.includes(startTime);
        const isValidEnd = timeSlots.includes(endTime) || endTime === "22:00"; // Allow 22:00 as end time
        
        if (!isValidStart) {
            return { isValid: false, message: 'เวลาเริ่มต้นไม่ถูกต้อง' };
        }
        
        if (!isValidEnd) {
            return { isValid: false, message: 'เวลาสิ้นสุดไม่ถูกต้อง' };
        }
        
        // Check if end time is after start time
        if (endTime <= startTime) {
            return { isValid: false, message: 'เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น' };
        }
        
        return { isValid: true };
    }
}

// Export for use in other modules  
window.SabaiBookingManager = SabaiBookingManager;