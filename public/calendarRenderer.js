// Calendar Rendering and Display Logic
console.log('🚀 Loading SabaiCalendarRenderer...');

class SabaiCalendarRenderer {
    constructor(dataService, app) {
        console.log('🔧 Initializing SabaiCalendarRenderer...', { dataService, app });
        
        this.dataService = dataService;
        this.app = app; // Store app reference
        this.currentTimeIndicator = null;
        this.timeUpdateInterval = null;
        this.currentTimeSlots = []; // Store time slots for position calculation
        this.activeTherapistsCount = 0; // Store therapist count for layout
        
        try {
            this.initCurrentTimeIndicator();
            console.log('✅ SabaiCalendarRenderer initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing SabaiCalendarRenderer:', error);
            throw error;
        }
    }
    
    // Initialize current time indicator with auto-update
    initCurrentTimeIndicator() {
        // Start updating current time indicator every minute
        this.updateCurrentTimeIndicator();
        this.timeUpdateInterval = setInterval(() => {
            this.updateCurrentTimeIndicator();
        }, 60000); // Update every minute
        
        // Handle window visibility changes for battery optimization
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Update immediately when tab becomes visible
                this.updateCurrentTimeIndicator();
            }
        });
    }
    
    // Calculate current time indicator position
    calculateCurrentTimePosition() {
        // Check if CONFIG is available
        if (typeof CONFIG === 'undefined') {
            console.error('❌ CONFIG object not available');
            return null;
        }
        
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        console.log('🕐 Current time calculation:', {
            currentHour,
            currentMinute,
            currentTimeString,
            shopHours: `${CONFIG.SHOP_START_HOUR}-${CONFIG.SHOP_END_HOUR}`
        });
        
        // Check if current time is within business hours using minutes comparison
        const currentMinutes = currentHour * 60 + currentMinute;
        const startMinutes = CONFIG.SHOP_START_HOUR * 60;
        const endMinutes = (CONFIG.SHOP_END_HOUR + 1) * 60; // +1 เพื่อให้ครอบคลุมถึง 23:00 สำหรับ slot 22:30-23:00
        
        console.log('⏱️ Minutes comparison:', {
            currentMinutes,
            startMinutes,
            endMinutes,
            isWithinHours: currentMinutes >= startMinutes && currentMinutes < endMinutes
        });
        
        if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
            console.log('⏰ Outside business hours');
            return null; // Outside business hours
        }
        
        console.log('✅ Within business hours');
        console.log('📅 Available time slots:', this.currentTimeSlots);
        
        // Find the time slot that contains the current time
        let targetSlotIndex = -1;
        let positionRatio = 0;
        
        for (let i = 0; i < this.currentTimeSlots.length; i++) {
            const slotTime = this.currentTimeSlots[i];
            const [slotHour, slotMinute] = slotTime.split(':').map(Number);
            const nextSlotIndex = i + 1;
            
            let nextSlotHour, nextSlotMinute;
            if (nextSlotIndex < this.currentTimeSlots.length) {
                [nextSlotHour, nextSlotMinute] = this.currentTimeSlots[nextSlotIndex].split(':').map(Number);
            } else {
                // Last slot - use slot duration to calculate end time
                const slotDuration = CONFIG.SLOT_DURATION || 30; // Default fallback
                nextSlotMinute = slotMinute + slotDuration;
                nextSlotHour = slotHour + Math.floor(nextSlotMinute / 60);
                nextSlotMinute = nextSlotMinute % 60;
            }
            
            const slotStartMinutes = (slotHour * 60) + slotMinute;
            const slotEndMinutes = (nextSlotHour * 60) + nextSlotMinute;
            const currentMinutes = (currentHour * 60) + currentMinute;
            
            console.log(`🕰️ Checking slot ${i}: ${slotTime} (${slotStartMinutes}-${slotEndMinutes} min), current: ${currentMinutes} min`);
            
            if (currentMinutes >= slotStartMinutes && currentMinutes < slotEndMinutes) {
                targetSlotIndex = i;
                const slotDuration = slotEndMinutes - slotStartMinutes;
                const elapsedMinutes = currentMinutes - slotStartMinutes;
                positionRatio = elapsedMinutes / slotDuration;
                console.log(`🎯 Found target slot ${i}: ratio ${positionRatio}`);
                break;
            }
        }
        
        if (targetSlotIndex === -1) {
            console.log('❌ Current time doesn\'t match any slot');
            return null; // Current time doesn't match any slot
        }
        
        const result = {
            slotIndex: targetSlotIndex,
            positionRatio: positionRatio,
            currentTime: currentTimeString
        };
        
        console.log('✅ Position calculation result:', result);
        return result;
    }
    
    // Update current time indicator
    updateCurrentTimeIndicator() {
        console.log('🕒 Updating current time indicator...');
        
        if (!this.currentTimeIndicator) {
            console.log('❌ No current time indicator element found');
            return;
        }
        
        console.log('✅ Current time indicator element exists');
        
        const position = this.calculateCurrentTimePosition();
        console.log('📍 Calculated position:', position);
        
        if (!position) {
            // Hide indicator if outside business hours
            console.log('⏰ Outside business hours - hiding indicator');
            this.currentTimeIndicator.style.display = 'none';
            return;
        }

        console.log('🎯 Position found - showing indicator');
        
        // Show indicator
        this.currentTimeIndicator.style.display = 'block';
        
        // Update time label
        const timeLabel = this.currentTimeIndicator.querySelector('.current-time-label');
        timeLabel.textContent = position.currentTime;
        
        console.log('⏰ Time label updated:', position.currentTime);
        
        // Calculate position within the calendar grid
        // Each row contains: 1 time cell + N therapist cells
        // We need to position the indicator across all therapist cells for the target time slot
        const container = document.getElementById('calendarWithHeaders');
        if (!container) {
            console.log('❌ Calendar container not found');
            return;
        }
        
        console.log('📦 Container found, active therapists:', this.activeTherapistsCount);
        
        // Find the time cell for the target slot (remember +1 for header row)
        const headerRowCells = this.activeTherapistsCount + 1; // time cell + therapist cells
        const targetTimeRowIndex = 1 + position.slotIndex; // +1 for header row
        const timeCellIndex = targetTimeRowIndex * headerRowCells; // time cell is first in each row
        
        const timeCell = container.children[timeCellIndex];
        if (!timeCell) {
            console.log('❌ Time cell not found at index:', timeCellIndex);
            return;
        }
        
        console.log('⏱️ Time cell found at index:', timeCellIndex);
        
        const timeCellRect = timeCell.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate top position based on slot and ratio within slot
        const slotHeight = timeCellRect.height;
        const topPosition = timeCellRect.top - containerRect.top + (slotHeight * position.positionRatio);
        
        this.currentTimeIndicator.style.top = topPosition + 'px';
        
        // Set the indicator to span full width of all therapist columns
        const timeCellWidth = timeCellRect.width;
        const containerWidth = containerRect.width;
        
        this.currentTimeIndicator.style.left = timeCellWidth + 'px';
        this.currentTimeIndicator.style.width = (containerWidth - timeCellWidth) + 'px';
        
        console.log('📏 Indicator positioned at:', {
            top: topPosition + 'px',
            left: timeCellWidth + 'px',
            width: (containerWidth - timeCellWidth) + 'px'
        });
    }
    
    // Create current time indicator element
    createCurrentTimeIndicator() {
        console.log('🔧 Creating current time indicator element...');
        
        const indicator = document.createElement('div');
        indicator.className = 'current-time-indicator';
        indicator.style.display = 'none';
        
        console.log('📐 Base indicator created with class:', indicator.className);
        
        const timeLabel = document.createElement('div');
        timeLabel.className = 'current-time-label';
        timeLabel.textContent = '00:00';
        
        console.log('🏷️ Time label created with class:', timeLabel.className);
        
        indicator.appendChild(timeLabel);
        
        // Force some basic styling to ensure visibility
        indicator.style.position = 'absolute';
        indicator.style.height = '2px';
        indicator.style.background = '#ff0000';
        indicator.style.zIndex = '100';
        indicator.style.pointerEvents = 'none';
        indicator.style.boxShadow = '0 0 4px rgba(255, 0, 0, 0.5)';
        
        console.log('✨ Indicator styled, final element:', indicator.outerHTML);
        
        return indicator;
    }

    // Generate consistent grid template columns for both headers and grid
    generateGridColumns(therapistCount) {
        // For mobile devices, use fixed widths to prevent layout issues
        const width = window.innerWidth;
        const isSmallMobile = width <= 480;
        const isMobile = width <= 768;
        const timeColumnWidth = isSmallMobile ? '50px' : isMobile ? '60px' : '80px';
        const therapistColumnWidth = isSmallMobile ? 'minmax(75px, 1fr)' : isMobile ? 'minmax(90px, 1fr)' : 'minmax(120px, 1fr)';

        return `${timeColumnWidth} repeat(${therapistCount}, ${therapistColumnWidth})`;
    }

    // Render main calendar
    renderCalendar(therapists, bookings, services, timeSlots, currentDate) {
        this.renderDateDisplay(currentDate);
        this.renderCalendarWithHeaders(therapists, bookings, services, timeSlots, currentDate);
    }

    // Render current date display
    renderDateDisplay(currentDate) {
        const dateElement = document.getElementById('selectedDate');
        dateElement.textContent = SabaiUtils.formatDisplayDate(currentDate);
    }

    // Render calendar with integrated headers
    renderCalendarWithHeaders(therapists, bookings, services, timeSlots, currentDate) {
        const container = document.getElementById('calendarWithHeaders');
        container.innerHTML = '';
        
        // Get only active therapists for display
        const activeTherapists = therapists.filter(t => t.status === 'active');
        this.activeTherapistsCount = activeTherapists.length;
        this.currentTimeSlots = timeSlots;
        
        // Set grid layout with consistent column sizing
        const columnTemplate = this.generateGridColumns(activeTherapists.length);
        container.style.gridTemplateColumns = columnTemplate;
        container.style.width = '100%';
        container.style.minWidth = '0';
        container.style.boxSizing = 'border-box';
        container.style.position = 'relative'; // For absolute positioning of time indicator
        
        // First, render header row
        this.renderHeaderRow(activeTherapists, container);
        
        // Then, render time slots and bookings
        timeSlots.forEach((timeSlot, timeIndex) => {
            // Add time cell
            const timeCell = this.createTimeCell(timeSlot);
            container.appendChild(timeCell);
            
            // Add booking slots for each active therapist
            activeTherapists.forEach((therapist, therapistIndex) => {
                const slot = this.createBookingSlot(
                    therapist, 
                    timeSlot, 
                    therapistIndex, 
                    timeIndex, 
                    bookings, 
                    services, 
                    currentDate
                );
                container.appendChild(slot);
            });
        });
        
        // Add summary rows
        this.renderSummaryRows(activeTherapists, bookings, services, container, currentDate);
        
        // Add current time indicator
        this.addCurrentTimeIndicator(container);
    }
    
    // Calculate income summaries
    calculateIncomeSummaries(therapists, bookings, services, currentDate) {
        const summaries = {
            therapistTotals: {},
            therapistFeeTotals: {},
            grandTotal: 0,
            grandTotalTherapistFee: 0
        };
        
        // Filter bookings for current date
        const dateKey = SabaiUtils.formatDateKey(currentDate);
        const dayBookings = bookings.filter(booking => booking.dateKey === dateKey);
        
        // Initialize therapist totals
        therapists.forEach(therapist => {
            summaries.therapistTotals[therapist.id] = {
                name: therapist.name,
                total: 0,
                bookingCount: 0
            };
            summaries.therapistFeeTotals[therapist.id] = {
                name: therapist.name,
                total: 0
            };
        });
        
        // Calculate totals
        dayBookings.forEach(booking => {
            let bookingPrice = 0;
            let therapistFeeAmount = 0;
            
            // Calculate booking price
            let basePrice = 0;
            if (booking.serviceId && services) {
                const service = services.find(s => s.id === booking.serviceId);
                if (service && service.durations) {
                    const duration = booking.duration || SabaiUtils.calculateDuration(booking.startTime, booking.endTime);
                    const durationOption = service.durations.find(d => d.duration === duration);
                    if (durationOption && durationOption.price) {
                        basePrice = durationOption.price;
                    }
                }
            }
            
            // If no service price found, use booking.price as fallback (for existing bookings)
            if (!basePrice && booking.price) {
                basePrice = booking.price;
            }
            
            // Apply discount if available
            if (basePrice > 0) {
                const discount = booking.discount || 0;
                const discountAmount = (basePrice * discount) / 100;
                bookingPrice = basePrice - discountAmount;
            }
            
            // Calculate therapist fee
            if (booking.therapistFee && booking.therapistFee > 0) {
                therapistFeeAmount = booking.therapistFee;
                console.log('💰 Summary: Using explicit therapist fee from booking:', therapistFeeAmount);
            } else if (booking.serviceId && services) {
                const service = services.find(s => s.id === booking.serviceId);
                if (service && service.durations) {
                    const duration = booking.duration || SabaiUtils.calculateDuration(booking.startTime, booking.endTime);
                    const durationOption = service.durations.find(d => d.duration === duration);
                    console.log('📊 Summary: Service and duration option:', { service: service.name, duration, durationOption });
                    if (durationOption && durationOption.therapistFee !== undefined) {
                        therapistFeeAmount = durationOption.therapistFee;
                        console.log('💵 Summary: Using therapist fee from service:', therapistFeeAmount);
                    }
                }
            }
            
            if (booking.therapistId) {
                if (summaries.therapistTotals[booking.therapistId]) {
                    // Add revenue
                    if (bookingPrice > 0) {
                        summaries.therapistTotals[booking.therapistId].total += bookingPrice;
                        summaries.grandTotal += bookingPrice;
                    }
                    summaries.therapistTotals[booking.therapistId].bookingCount++;
                    
                    // Add therapist fee
                    if (therapistFeeAmount > 0) {
                        summaries.therapistFeeTotals[booking.therapistId].total += therapistFeeAmount;
                        summaries.grandTotalTherapistFee += therapistFeeAmount;
                    }
                }
            }
        });
        
        return summaries;
    }
    
    // Render summary rows
    renderSummaryRows(therapists, bookings, services, container, currentDate) {
        const summaries = this.calculateIncomeSummaries(therapists, bookings, services, currentDate);
        
        // Create summary time cell
        const summaryTimeCell = document.createElement('div');
        summaryTimeCell.className = 'summary-time-cell';
        summaryTimeCell.innerHTML = `
            <div class="summary-section-title">ยอดรวมทั้งหมด</div>
            <div class="summary-amount">${summaries.grandTotal.toLocaleString()} ฿</div>
            <div class="summary-fee-label">ค่ามือรวม</div>
            <div class="summary-fee-amount">${summaries.grandTotalTherapistFee.toLocaleString()} ฿</div>
        `;
        container.appendChild(summaryTimeCell);

        // Create summary cells for each therapist
        therapists.forEach(therapist => {
            const therapistSummary = summaries.therapistTotals[therapist.id];
            const therapistFeeSummary = summaries.therapistFeeTotals[therapist.id];
            const summaryCell = document.createElement('div');
            summaryCell.className = 'summary-therapist-cell';
            summaryCell.innerHTML = `
                <div class="summary-section-title">${therapist.name}</div>
                <div class="summary-amount">${therapistSummary.total.toLocaleString()} ฿</div>
                <div class="summary-fee-label">ค่ามือ</div>
                <div class="summary-fee-amount">${therapistFeeSummary.total.toLocaleString()} ฿</div>
                <div class="summary-count-badge">${therapistSummary.bookingCount} การจอง</div>
            `;
            container.appendChild(summaryCell);
        });
    }
    
    // Add current time indicator to calendar
    addCurrentTimeIndicator(container) {
        console.log('🚀 Adding current time indicator to calendar...');
        
        // Remove existing indicator if it exists
        if (this.currentTimeIndicator) {
            console.log('🗑️ Removing existing indicator');
            this.currentTimeIndicator.remove();
        }
        
        // Create new indicator
        console.log('🔨 Creating new time indicator');
        this.currentTimeIndicator = this.createCurrentTimeIndicator();
        container.appendChild(this.currentTimeIndicator);
        
        console.log('✅ Time indicator added to DOM');
        console.log('📋 Indicator element:', this.currentTimeIndicator);
        console.log('🎨 Indicator styles:', this.currentTimeIndicator.style.cssText);
        
        // Update position immediately
        setTimeout(() => {
            console.log('⏱️ Updating indicator position after DOM render...');
            this.updateCurrentTimeIndicator();
        }, 100); // Small delay to ensure DOM is rendered
    }
    
    // Cleanup method to prevent memory leaks
    cleanup() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
            this.timeUpdateInterval = null;
        }
        if (this.currentTimeIndicator) {
            this.currentTimeIndicator.remove();
            this.currentTimeIndicator = null;
        }
    }
    
    // Render header row as first row of grid
    renderHeaderRow(activeTherapists, container) {
        // Time header cell
        const timeHeader = document.createElement('div');
        timeHeader.className = 'header-time-cell';
        timeHeader.textContent = 'เวลา';
        container.appendChild(timeHeader);
        
        // Therapist header cells
        activeTherapists.forEach(therapist => {
            const header = document.createElement('div');
            header.className = 'header-therapist-cell';
            header.textContent = therapist.name;
            container.appendChild(header);
        });
    }

    // Create time cell
    createTimeCell(timeSlot) {
        const timeCell = document.createElement('div');
        timeCell.className = 'time-cell';
        timeCell.textContent = SabaiUtils.getTimeRange(timeSlot);
        
        // Ensure consistent cell styling
        timeCell.style.boxSizing = 'border-box';
        timeCell.style.minWidth = window.innerWidth <= 768 ? '60px' : '80px';
        timeCell.style.maxWidth = window.innerWidth <= 768 ? '60px' : '80px';
        
        return timeCell;
    }

    // Create individual booking slot
    createBookingSlot(therapist, timeSlot, therapistIndex, timeIndex, bookings, services, currentDate) {
        const slot = document.createElement('div');
        slot.className = 'booking-slot';
        slot.dataset.therapistId = therapist.id;
        slot.dataset.timeSlot = timeSlot;
        
        // Ensure consistent cell styling
        slot.style.boxSizing = 'border-box';
        const isMobile = window.innerWidth <= 768;
        slot.style.minWidth = isMobile ? '100px' : '120px';
        slot.style.width = '100%';
        slot.style.overflow = 'hidden';

        // Check if this slot is booked first
        const booking = this.dataService.findBookingForSlot(bookings, therapist.id, timeSlot, currentDate);
        
        if (booking) {
            this.renderBookedSlot(slot, booking, services, timeSlot, currentDate);
        } else {
            this.renderEmptySlot(slot, therapist, timeSlot, therapistIndex, timeIndex);
        }

        return slot;
    }

    // Render a booked slot
    renderBookedSlot(slot, booking, services, timeSlot, currentDate) {
        slot.classList.add('booked');
        
        // Same booking ID = same color
        const bookingColorHue = SabaiUtils.getBookingColor(booking.id);
        const bookingColor = `hsl(${bookingColorHue}, 50%, 60%)`;
        slot.style.backgroundColor = bookingColor;
        
        // Add hover effect
        this.addBookingHoverEffect(slot, bookingColorHue);
        
        // Only show booking info on the first slot of the booking
        if (this.dataService.isFirstSlotOfBooking(booking, timeSlot, currentDate)) {
            const info = this.createBookingInfo(booking, services);
            slot.appendChild(info);
        }
        
        // Add click handler for editing
        slot.addEventListener('click', () => this.app.openEditBookingModal(booking));
    }

    // Render an empty slot
    renderEmptySlot(slot, therapist, timeSlot, therapistIndex, timeIndex) {
        // Empty slot styling with column and alternating row colors
        const hue = (therapistIndex * 51) % 360;
        const isEvenRow = timeIndex % 2 === 0;
        const lightness = isEvenRow ? 95 : 90;
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
        slot.addEventListener('click', () => this.app.openNewBookingModal(therapist, timeSlot));
    }

    // Create booking info display
    createBookingInfo(booking, services) {
        const info = document.createElement('div');
        info.className = 'booking-info';
        
        const duration = booking.duration || SabaiUtils.calculateDuration(booking.startTime, booking.endTime);
        const serviceName = this.dataService.getServiceName(booking.serviceId, services);
        const paymentMethodText = SabaiUtils.getPaymentMethodText(booking.paymentMethod);
        
        // Calculate display price automatically from service and duration
        let basePrice = 0;
        if (booking.serviceId && services) {
            // Find service and get price for duration
            const service = services.find(s => s.id === booking.serviceId);
            if (service && service.durations) {
                const durationOption = service.durations.find(d => d.duration === duration);
                if (durationOption && durationOption.price) {
                    basePrice = durationOption.price;
                }
            }
        }
        
        // If no service price found, use booking.price as fallback (for existing bookings)
        if (!basePrice && booking.price) {
            basePrice = booking.price;
        }
        
        // Apply discount if available
        let finalPrice = basePrice;
        let priceDisplay = '';
        if (basePrice) {
            const discount = booking.discount || 0;
            if (discount > 0) {
                const discountAmount = (basePrice * discount) / 100;
                finalPrice = basePrice - discountAmount;
                priceDisplay = `<div class="price" style="color: #333; background: rgba(255,255,255,0.9); padding: 2px 6px; border-radius: 3px; font-weight: bold; margin-top: 2px;"><span style="text-decoration: line-through; color: #888; font-size: 10px;">${basePrice}฿</span> <span style="color: #d32f2f;">${finalPrice.toLocaleString()}฿</span></div>`;
            } else {
                priceDisplay = `<div class="price" style="color: #333; background: rgba(255,255,255,0.9); padding: 2px 6px; border-radius: 3px; font-weight: bold; margin-top: 2px;">${finalPrice.toLocaleString()}฿</div>`;
            }
        }
        
        // Add therapist fee info - check both booking and service data
        let therapistFeeDisplay = '';
        let therapistFeeAmount = 0;
        
        // Debug log
        console.log('🔍 Calculating therapist fee for booking:', booking.id);
        console.log('📊 Booking data:', { serviceId: booking.serviceId, therapistFee: booking.therapistFee, duration });
        
        // First check if booking has explicit therapistFee
        if (booking.therapistFee && booking.therapistFee > 0) {
            therapistFeeAmount = booking.therapistFee;
            console.log('💰 Using explicit therapist fee from booking:', therapistFeeAmount);
        } else if (booking.serviceId && services && services.length > 0) {
            // If no explicit fee, try to get from service data
            const service = services.find(s => s.id === booking.serviceId);
            console.log('🔎 Found service:', service);
            
            if (service && service.durations && service.durations.length > 0) {
                console.log('📋 Service durations:', service.durations);
                const durationOption = service.durations.find(d => d.duration === duration);
                console.log('⏰ Found duration option:', durationOption);
                
                if (durationOption && durationOption.therapistFee !== undefined) {
                    therapistFeeAmount = durationOption.therapistFee;
                    console.log('💵 Using therapist fee from service:', therapistFeeAmount);
                } else {
                    console.log('❌ No therapist fee found in duration option');
                }
            } else {
                console.log('❌ No service durations found');
            }
        } else {
            console.log('❌ No serviceId or services not loaded');
        }
        
        // Always show therapist fee if we have service or booking fee data
        if (booking.serviceId || booking.therapistFee !== undefined) {
            therapistFeeDisplay = `<div class="therapist-fee" style="color: #f57c00; background: rgba(255, 255, 255, 0.4); padding: 1px 4px; border-radius: 3px; font-size: 10px; margin-top: 1px;">ค่ามือ: ${therapistFeeAmount.toLocaleString()}฿</div>`;
            console.log('✅ Displaying therapist fee:', therapistFeeAmount);
        }
        
        info.innerHTML = `
            <div>${duration} นาที.</div>
            <div>${serviceName || 'ไม่มีบริการ'}</div>
            ${priceDisplay}
            ${therapistFeeDisplay}
            ${paymentMethodText ? `<div style="font-size: 11px;">${paymentMethodText}</div>` : ''}
            ${booking.note ? `<div style="font-size: 10px; opacity: 0.9;">${booking.note}</div>` : ''}
        `;
        
        return info;
    }

    // Add booking hover effect
    addBookingHoverEffect(slot, bookingColorHue) {
        const normalColor = `hsl(${bookingColorHue}, 50%, 60%)`;
        const hoverColor = `hsl(${bookingColorHue}, 60%, 50%)`;
        
        slot.addEventListener('mouseenter', () => {
            slot.style.backgroundColor = hoverColor;
        });
        slot.addEventListener('mouseleave', () => {
            slot.style.backgroundColor = normalColor;
        });
    }

    // Calendar capture functionality
    async captureCalendar(currentDate) {
        try {
            const captureBtn = document.getElementById('captureBtn');
            const originalText = captureBtn.textContent;
            captureBtn.textContent = '📸 กำลังบันทึก...';
            captureBtn.disabled = true;

            console.log('📷 Starting calendar capture...');

            // Get calendar elements  
            const calendarWithHeaders = document.getElementById('calendarWithHeaders');
            
            // Create temporary container
            const tempContainer = this.createTempContainer(currentDate, null, calendarWithHeaders);
            
            console.log('📦 Temporary container created:', tempContainer.children.length, 'children');
            
            // Add to document and capture
            document.body.appendChild(tempContainer);
            
            // Wait longer to ensure all styles are applied
            await new Promise(resolve => setTimeout(resolve, 300));
            
            console.log('✅ Temporary container added to DOM, ready for capture');
            console.log('📐 Container dimensions:', {
                width: tempContainer.scrollWidth,
                height: tempContainer.scrollHeight
            });
            
            // Configure capture options
            const options = {
                backgroundColor: '#ffffff',
                scale: 1.5, // Reduced scale for better compatibility
                useCORS: true,
                allowTaint: false,
                scrollX: 0,
                scrollY: 0,
                width: tempContainer.scrollWidth + 40,
                height: tempContainer.scrollHeight + 40,
                ignoreElements: (element) => {
                    // Ignore any remaining time indicators
                    return element.classList && element.classList.contains('current-time-indicator');
                }
            };

            console.log('🖼️ Capture options:', options);

            // Create canvas and download
            const canvas = await html2canvas(tempContainer, options);
            
            console.log('🎨 Canvas created:', {
                width: canvas.width,
                height: canvas.height
            });
            
            document.body.removeChild(tempContainer);
            
            this.downloadCanvas(canvas, currentDate);
            
            // Reset button
            captureBtn.textContent = originalText;
            captureBtn.disabled = false;
            
            console.log('✅ Complete calendar captured and downloaded successfully');
            alert('บันทึกตารางสำเร็จ! ไฟล์จะถูกดาวน์โหลดอัตโนมัติ');
            
        } catch (error) {
            console.error('❌ Error capturing calendar:', error);
            
            // Remove temp container if it still exists
            const existingTemp = document.querySelector('[style*="position: fixed"][style*="-9999px"]');
            if (existingTemp) {
                document.body.removeChild(existingTemp);
            }
            
            alert('ไม่สามารถบันทึกตารางได้ กรุณาลองใหม่อีกครั้ง\n\nError: ' + error.message);
            
            // Reset button on error
            const captureBtn = document.getElementById('captureBtn');
            captureBtn.textContent = '📷 บันทึกตาราง';
            captureBtn.disabled = false;
        }
    }

    // Create temporary container for capture
    createTempContainer(currentDate, therapistHeadersParam, calendarGrid) {
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        tempContainer.style.background = '#ffffff';
        tempContainer.style.padding = '20px';
        tempContainer.style.fontFamily = getComputedStyle(document.body).fontFamily;
        tempContainer.style.width = 'auto';
        tempContainer.style.height = 'auto';
        tempContainer.style.display = 'block';
        
        // Add title
        const dateDisplay = document.getElementById('selectedDate');
        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = `<h2 style="text-align: center; margin: 0 0 20px 0; color: #1d1d1f; font-size: 24px;">Saba-i Booking Board - ${dateDisplay.textContent}</h2>`;
        
        // Get original calendar for reference
        const calendarWithHeaders = document.getElementById('calendarWithHeaders');
        const originalTherapistHeaders = calendarWithHeaders.querySelectorAll('.header-therapist-cell');
        
        // Create header row first
        const headerRow = document.createElement('div');
        headerRow.style.display = 'grid';
        headerRow.style.gridTemplateColumns = calendarWithHeaders.style.gridTemplateColumns;
        headerRow.style.gap = '1px';
        headerRow.style.marginBottom = '0';
        headerRow.style.background = '#f5f5f5';
        headerRow.style.border = '1px solid #ddd';
        
        // Time header cell
        const timeHeaderCell = document.createElement('div');
        timeHeaderCell.style.padding = '8px';
        timeHeaderCell.style.background = '#e8e8e8';
        timeHeaderCell.style.border = '1px solid #ccc';
        timeHeaderCell.style.fontWeight = 'bold';
        timeHeaderCell.style.textAlign = 'center';
        timeHeaderCell.style.fontSize = '14px';
        timeHeaderCell.textContent = 'เวลา';
        headerRow.appendChild(timeHeaderCell);
        
        // Therapist header cells
        originalTherapistHeaders.forEach((header) => {
            const therapistHeaderCell = document.createElement('div');
            therapistHeaderCell.style.padding = '8px';
            therapistHeaderCell.style.background = '#e8e8e8';
            therapistHeaderCell.style.border = '1px solid #ccc';
            therapistHeaderCell.style.fontWeight = 'bold';
            therapistHeaderCell.style.textAlign = 'center';
            therapistHeaderCell.style.fontSize = '14px';
            therapistHeaderCell.textContent = header.textContent;
            headerRow.appendChild(therapistHeaderCell);
        });
        
        console.log('📋 Created header row with', originalTherapistHeaders.length, 'therapists');
        
        // Clone the calendar data (without the header row)
        const calendarClone = calendarWithHeaders.cloneNode(true);
        
        // Remove the header elements from clone (they are first row in grid)
        const headerElements = [];
        const timeHeaderElement = calendarClone.querySelector('.header-time-cell');
        const therapistHeaderElements = calendarClone.querySelectorAll('.header-therapist-cell');
        
        if (timeHeaderElement) {
            headerElements.push(timeHeaderElement);
            timeHeaderElement.remove(); 
        }
        therapistHeaderElements.forEach(el => {
            headerElements.push(el);
            el.remove();
        });
        
        console.log('🗑️ Removed', headerElements.length, 'header elements from data clone');
        
        // Remove any time indicators from the clone
        const timeIndicators = calendarClone.querySelectorAll('.current-time-indicator');
        timeIndicators.forEach(indicator => indicator.remove());
        
        // Style the data clone
        calendarClone.style.display = 'grid';
        calendarClone.style.gridTemplateColumns = calendarWithHeaders.style.gridTemplateColumns;
        calendarClone.style.gap = '1px';
        calendarClone.style.margin = '0';
        calendarClone.style.width = '100%';
        calendarClone.style.boxSizing = 'border-box';
        calendarClone.style.position = 'static';
        calendarClone.style.border = '1px solid #ddd';
        calendarClone.style.borderTop = 'none'; // Connect with header
        
        console.log('📊 Data clone prepared');
        
        // Append elements in correct order: Title -> Header -> Data
        tempContainer.appendChild(titleDiv);
        tempContainer.appendChild(headerRow); 
        tempContainer.appendChild(calendarClone);
        
        return tempContainer;
    }

    // Download canvas as image
    downloadCanvas(canvas, currentDate) {
        const link = document.createElement('a');
        const dateStr = SabaiUtils.formatDateKey(currentDate);
        const dateDisplay = SabaiUtils.formatDisplayDate(currentDate);
        link.download = `Saba-i-Report-${dateStr}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        
        console.log('💾 Downloading calendar image:', link.download);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ Download initiated successfully');
    }
}

console.log('✅ SabaiCalendarRenderer class defined');

// Export for use in other modules
window.SabaiCalendarRenderer = SabaiCalendarRenderer;

console.log('✅ SabaiCalendarRenderer exported to window');