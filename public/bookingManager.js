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

        // Close (×) button handler
        document.getElementById('closeBookingBtn').addEventListener('click', () => {
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
        
        // Discount change handler
        document.getElementById('discount').addEventListener('change', () => {
            this.calculateFinalPrice();
        });
        
        // Therapist fee change handler
        document.getElementById('therapistFee').addEventListener('input', () => {
            this.calculateFinalPrice();
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
        log('🎯 Setting default booking values for:', therapist.name, 'at', timeSlot);
        
        const form = document.getElementById('bookingForm');
        
        // Set therapist
        form.therapistId.value = therapist.id;
        
        // Set start time - ensure the value exists in the dropdown
        log('⏰ Setting start time to:', timeSlot);
        form.startTime.value = timeSlot;
        
        // Verify that the value was set correctly
        if (form.startTime.value !== timeSlot) {
            console.warn('⚠️ Failed to set startTime, available options:', Array.from(form.startTime.options).map(opt => opt.value));
        } else {
            log('✅ Start time set successfully:', form.startTime.value);
        }
        
        // Set default duration and calculate end time
        form.duration.value = '60';
        this.updateEndTimeBasedOnDuration();
        
        // Clear other fields
        form.serviceId.value = '';
        form.discount.value = '0';
        form.therapistFee.value = '';
        form.paymentMethod.value = '';
        form.note.value = '';
        
        // Auto-calculate price based on service (will be empty for new bookings)
        setTimeout(() => {
            this.updatePriceBasedOnService();
        }, 50);
        
        // Clear error message
        this.clearErrorMessage();
        
        log('🎯 Default booking values set successfully');
    }

    // Populate form with existing booking data
    populateFormWithBookingData(booking) {
        log('📊 Populating form with booking data:', booking);
        const form = document.getElementById('bookingForm');
        
        // Set therapist
        log('👩‍⚕️ Setting therapist ID:', booking.therapistId);
        form.therapistId.value = booking.therapistId || '';
        log('✅ Therapist value set to:', form.therapistId.value, 'Available options:', Array.from(form.therapistId.options).map(o => o.value));
        
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
            log('⏰ Setting start time to:', startTimeValue);
            form.startTime.value = startTimeValue;
            log('✅ Start time value set to:', form.startTime.value, 'Available options:', Array.from(form.startTime.options).map(o => o.value));
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
            const endTimeBadge = document.getElementById('endTimeBadge');
            if (endTimeBadge) endTimeBadge.textContent = endTimeValue;
        } else {
            form.endTime.value = '';
        }
        
        // Set other form values
        form.duration.value = booking.duration || '60';
        form.serviceId.value = booking.serviceId || '';
        form.discount.value = booking.discount || '0';
        form.therapistFee.value = booking.therapistFee || '';
        form.paymentMethod.value = booking.paymentMethod || '';
        form.note.value = booking.note || '';
        
        // Update price based on service after setting values
        setTimeout(() => {
            this.updatePriceBasedOnService();
        }, 50);
        
        log('📊 Form populated with booking data successfully');
        this.clearErrorMessage();
    }

    // Update end time based on duration
    updateEndTimeBasedOnDuration() {
        const startTimeElement = document.getElementById('startTime');
        const durationElement = document.getElementById('duration');
        const endTimeElement = document.getElementById('endTime');
        const endTimeBadge = document.getElementById('endTimeBadge');

        const startTime = startTimeElement.value;
        const duration = parseInt(durationElement.value);

        if (startTime && duration) {
            const endTime = SabaiUtils.addMinutes(startTime, duration);
            endTimeElement.value = endTime;
            if (endTimeBadge) endTimeBadge.textContent = endTime;
        } else {
            if (endTimeBadge) endTimeBadge.textContent = '--:--';
        }
    }

    // Show booking modal
    showBookingModal() {
        // Refresh form dropdowns in case data changed
        this.populateFormDropdowns();
        // Reset price summary
        const priceSummary = document.getElementById('priceSummary');
        if (priceSummary) priceSummary.style.display = 'none';
        document.getElementById('bookingModalOverlay').style.display = 'flex';
    }

    // Close booking modal
    closeBookingModal() {
        document.getElementById('bookingModalOverlay').style.display = 'none';
        this.editingBooking = null;
    }

    // Handle save booking
    async handleSaveBooking() {
        const saveBtn = document.getElementById('saveBooking');
        try {
            const bookingData = this.getBookingDataFromForm();

            // Validate booking data
            const validationResult = SabaiUtils.validateBookingData(bookingData);
            if (!validationResult.isValid) {
                this.showErrorMessage(validationResult.message);
                return;
            }

            // Check for conflicts
            const hasConflict = await this.checkBookingConflict(bookingData, this.editingBooking?.id);
            if (hasConflict) {
                const timeRange = `${bookingData.startTime.getHours().toString().padStart(2,'0')}:${bookingData.startTime.getMinutes().toString().padStart(2,'0')} - ${bookingData.endTime.getHours().toString().padStart(2,'0')}:${bookingData.endTime.getMinutes().toString().padStart(2,'0')}`;
                this.showErrorMessage(`มีการจองในช่วงเวลา ${timeRange} แล้ว กรุณาเลือกเวลาอื่น`);
                return;
            }

            // Show saving state
            saveBtn.classList.add('saving');
            saveBtn.textContent = 'กำลังบันทึก...';

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
        } finally {
            saveBtn.classList.remove('saving');
            saveBtn.textContent = 'บันทึก';
        }
    }

    // Handle delete booking
    async handleDeleteBooking() {
        if (!this.editingBooking) return;

        if (confirm('ต้องการลบการจองนี้หรือไม่?')) {
            const deleteBtn = document.getElementById('deleteBooking');
            try {
                deleteBtn.classList.add('saving');
                deleteBtn.textContent = 'กำลังลบ...';
                await this.dataService.deleteBooking(this.editingBooking.id);
                this.closeBookingModal();
            } catch (error) {
                console.error('Error deleting booking:', error);
                this.showErrorMessage('เกิดข้อผิดพลาดในการลบ กรุณาลองใหม่อีกครั้ง');
            } finally {
                deleteBtn.classList.remove('saving');
                deleteBtn.textContent = 'ลบ';
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
        
        // Get the calculated price based on service and duration
        const calculatedPrice = this.getCalculatedPrice();
        
        return {
            therapistId: form.therapistId.value,
            dateKey: SabaiUtils.formatDateKey(currentDate),
            startTime: createDateTime(form.startTime.value),
            endTime: createDateTime(form.endTime.value),
            duration: parseInt(form.duration.value),
            serviceId: form.serviceId.value,
            price: calculatedPrice,
            discount: parseFloat(form.discount.value) || 0,
            therapistFee: form.therapistFee.value ? parseFloat(form.therapistFee.value) : null,
            paymentMethod: form.paymentMethod.value,
            note: form.note.value,
            timestamp: new Date()
        };
    }

    // Check for booking conflicts - comprehensive check
    async checkBookingConflict(bookingData, excludeBookingId = null) {
        log('🔍 Starting comprehensive conflict check...');
        
        // 1. เช็คจาก memory cache ก่อน (รวดเร็ว)
        const bookings = this.app.bookings;
        if (bookings && bookings.length > 0) {
            const newBooking = {
                therapistId: bookingData.therapistId,
                startTime: bookingData.startTime,
                endTime: bookingData.endTime
            };
            
            const cacheConflict = this.dataService.checkBookingConflict(
                bookings,
                newBooking,
                excludeBookingId
            );
            
            if (cacheConflict) {
                log('❌ Conflict detected in memory cache');
                return true;
            }
        }
        
        // 2. เช็คจาก Firestore โดยตรง (แม่นยำ)
        try {
            const firestoreBooking = {
                therapistId: bookingData.therapistId,
                dateKey: bookingData.dateKey,
                startTime: bookingData.startTime,
                endTime: bookingData.endTime
            };
            
            const firestoreConflict = await this.dataService.checkBookingConflictFromFirestore(
                firestoreBooking,
                excludeBookingId
            );
            
            if (firestoreConflict) {
                log('❌ Conflict detected in Firestore');
                return true;
            }
            
        } catch (error) {
            console.error('⚠️ Firestore conflict check failed, using cache result:', error);
            // หาก Firestore check ล้มเหลว ให้ใช้ผลลัพธ์จาก cache
        }
        
        log('✅ No conflicts found in both cache and Firestore');
        return false;
    }

    // Create new booking safely
    async createBooking(bookingData) {
        try {
            // ใช้ createBookingSafely แทน createBooking ปกติ
            const bookingId = await this.dataService.createBookingSafely(bookingData);
            log('✅ Safe booking created with ID:', bookingId, '- real-time listener will update UI automatically');
            return bookingId;
        } catch (error) {
            console.error('❌ Error creating safe booking:', error);
            throw error;
        }
    }

    // Update existing booking
    async updateBooking(bookingData) {
        await this.dataService.updateBooking(this.editingBooking.id, bookingData);
        log('✅ Booking updated - real-time listener will update UI automatically');
    }

    // Show error message
    showErrorMessage(message) {
        log('🚨 Showing error message:', message);
        
        // Prevent multiple alerts within short timeframe
        const now = Date.now();
        if (this.lastAlertTime && (now - this.lastAlertTime) < 1000) {
            log('🚫 Preventing duplicate alert within 1 second');
            return;
        }
        this.lastAlertTime = now;
        
        const modalOverlay = document.getElementById('bookingModalOverlay');
        const isModalOpen = modalOverlay && getComputedStyle(modalOverlay).display !== 'none';

        let errorElement = null;
        if (isModalOpen) {
            errorElement = document.getElementById('bookingErrorMessage');
        }
        if (!errorElement) {
            errorElement = document.getElementById('errorMessage');
        }

        if (errorElement) {
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

            setTimeout(() => {
                alert(message);
            }, 50);
        } else {
            alert(message);
        }
    }

    // Clear error message
    clearErrorMessage() {
        const bookingError = document.getElementById('bookingErrorMessage');
        if (bookingError) {
            bookingError.style.display = 'none';
            bookingError.textContent = '';
        }

        const mainError = document.getElementById('errorMessage');
        if (mainError) {
            mainError.classList.add('hidden');
        }
    }
    // Get calculated price based on service and duration
    getCalculatedPrice() {
        const form = document.getElementById('bookingForm');
        const serviceId = form.serviceId.value;
        const duration = parseInt(form.duration.value);
        
        if (serviceId && duration && this.app && this.app.services) {
            const service = this.app.services.find(s => s.id === serviceId);
            if (service && service.durations) {
                const durationOption = service.durations.find(d => d.duration === duration);
                if (durationOption && durationOption.price) {
                    return durationOption.price;
                }
            }
        }
        
        return null; // No price available
    }
    
    // Get calculated therapist fee based on service and duration
    getCalculatedTherapistFee() {
        const form = document.getElementById('bookingForm');
        const serviceId = form.serviceId.value;
        const duration = parseInt(form.duration.value);
        
        if (serviceId && duration && this.app && this.app.services) {
            const service = this.app.services.find(s => s.id === serviceId);
            if (service && service.durations) {
                const durationOption = service.durations.find(d => d.duration === duration);
                if (durationOption && durationOption.therapistFee) {
                    return durationOption.therapistFee;
                }
            }
        }
        
        return null; // No therapist fee available
    }
    
    // Calculate final price with discount
    calculateFinalPrice() {
        const basePrice = this.getCalculatedPrice() || 0;
        const form = document.getElementById('bookingForm');
        const discountPercent = parseFloat(form.discount.value) || 0;

        const priceSummary = document.getElementById('priceSummary');
        const priceSummaryText = document.getElementById('priceSummaryText');

        if (basePrice > 0) {
            const discountAmount = (basePrice * discountPercent) / 100;
            const finalPrice = basePrice - discountAmount;

            log(`💰 Price calculation: Base: ${basePrice}฿, Discount: ${discountPercent}% (-${discountAmount}฿), Final: ${finalPrice}฿`);

            if (priceSummary && priceSummaryText) {
                priceSummary.style.display = 'flex';
                priceSummaryText.textContent = discountPercent > 0
                    ? `${finalPrice.toLocaleString()}฿ (ลด ${discountPercent}%)`
                    : `${finalPrice.toLocaleString()}฿`;
            }
            return finalPrice;
        }

        if (priceSummary) priceSummary.style.display = 'none';
        return 0;
    }
    
    // Update price based on selected service and duration (now automatic only)
    updatePriceBasedOnService() {
        const serviceId = document.getElementById('serviceId').value;
        const duration = parseInt(document.getElementById('duration').value);
        
        log('💰 Auto-calculating price and therapist fee for service:', serviceId, 'duration:', duration);
        
        // Auto-calculate price
        const calculatedPrice = this.getCalculatedPrice();
        if (calculatedPrice) {
            log('💰 Auto-calculated price:', calculatedPrice, '฿');
        } else {
            log('💰 No price available for this service/duration combination');
        }
        
        // Auto-populate therapist fee
        const calculatedTherapistFee = this.getCalculatedTherapistFee();
        const therapistFeeField = document.getElementById('therapistFee');
        if (calculatedTherapistFee) {
            therapistFeeField.value = calculatedTherapistFee;
            log('💵 Auto-calculated therapist fee:', calculatedTherapistFee, '฿');
        } else {
            therapistFeeField.value = '';
            log('💵 No therapist fee available for this service/duration combination');
        }
        
        this.calculateFinalPrice();
        log('💰 Price and therapist fee update complete');
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