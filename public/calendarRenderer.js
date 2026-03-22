// Calendar Rendering and Display Logic
class SabaiCalendarRenderer {
    constructor(dataService, app) {
        this.dataService = dataService;
        this.app = app; // Store app reference
        this.currentTimeIndicator = null;
        this.timeUpdateInterval = null;
        this.currentTimeSlots = []; // Store time slots for position calculation
        this.activeTherapistsCount = 0; // Store therapist count for layout
        
        this.initCurrentTimeIndicator();
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
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        // Check if current time is within business hours
        if (currentHour < CONFIG.SHOP_START_HOUR || currentHour >= CONFIG.SHOP_END_HOUR) {
            return null; // Outside business hours
        }
        
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
                nextSlotMinute = slotMinute + CONFIG.SLOT_DURATION;
                nextSlotHour = slotHour + Math.floor(nextSlotMinute / 60);
                nextSlotMinute = nextSlotMinute % 60;
            }
            
            const slotStartMinutes = (slotHour * 60) + slotMinute;
            const slotEndMinutes = (nextSlotHour * 60) + nextSlotMinute;
            const currentMinutes = (currentHour * 60) + currentMinute;
            
            if (currentMinutes >= slotStartMinutes && currentMinutes < slotEndMinutes) {
                targetSlotIndex = i;
                const slotDuration = slotEndMinutes - slotStartMinutes;
                const elapsedMinutes = currentMinutes - slotStartMinutes;
                positionRatio = elapsedMinutes / slotDuration;
                break;
            }
        }
        
        if (targetSlotIndex === -1) {
            return null; // Current time doesn't match any slot
        }
        
        return {
            slotIndex: targetSlotIndex,
            positionRatio: positionRatio,
            currentTime: currentTimeString
        };
    }
    
    // Update current time indicator
    updateCurrentTimeIndicator() {
        if (!this.currentTimeIndicator) {
            return;
        }
        
        const position = this.calculateCurrentTimePosition();
        
        if (!position) {
            // Hide indicator if outside business hours
            this.currentTimeIndicator.style.display = 'none';
            return;
        }
        
        // Show indicator
        this.currentTimeIndicator.style.display = 'block';
        
        // Update time label
        const timeLabel = this.currentTimeIndicator.querySelector('.current-time-label');
        timeLabel.textContent = position.currentTime;
        
        // Calculate position within the calendar grid
        // Each row contains: 1 time cell + N therapist cells
        // We need to position the indicator across all therapist cells for the target time slot
        const container = document.getElementById('calendarWithHeaders');
        if (!container) return;
        
        // Find the time cell for the target slot (remember +1 for header row)
        const headerRowCells = this.activeTherapistsCount + 1; // time cell + therapist cells
        const targetTimeRowIndex = 1 + position.slotIndex; // +1 for header row
        const timeCellIndex = targetTimeRowIndex * headerRowCells; // time cell is first in each row
        
        const timeCell = container.children[timeCellIndex];
        if (!timeCell) return;
        
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
    }
    
    // Create current time indicator element
    createCurrentTimeIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'current-time-indicator';
        indicator.style.display = 'none';
        
        const timeLabel = document.createElement('div');
        timeLabel.className = 'current-time-label';
        timeLabel.textContent = '00:00';
        
        indicator.appendChild(timeLabel);
        
        return indicator;
    }

    // Generate consistent grid template columns for both headers and grid
    generateGridColumns(therapistCount) {
        // For mobile devices, use fixed widths to prevent layout issues
        const isMobile = window.innerWidth <= 768;
        const timeColumnWidth = isMobile ? '60px' : '80px';
        const therapistColumnWidth = isMobile ? 'minmax(100px, 1fr)' : 'minmax(120px, 1fr)';
        
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
        container.style.maxWidth = '100vw';
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
            grandTotal: 0
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
        });
        
        // Calculate totals
        dayBookings.forEach(booking => {
            let bookingPrice = 0;
            
            // Get base price automatically from service data
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
            
            if (bookingPrice > 0 && booking.therapistId) {
                if (summaries.therapistTotals[booking.therapistId]) {
                    summaries.therapistTotals[booking.therapistId].total += bookingPrice;
                    summaries.therapistTotals[booking.therapistId].bookingCount++;
                }
                summaries.grandTotal += bookingPrice;
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
            <div class="summary-label">ยอดรวมทั้งหมด</div>
            <div class="summary-amount">${summaries.grandTotal.toLocaleString()} ฿</div>
        `;
        container.appendChild(summaryTimeCell);
        
        // Create summary cells for each therapist
        therapists.forEach(therapist => {
            const therapistSummary = summaries.therapistTotals[therapist.id];
            const summaryCell = document.createElement('div');
            summaryCell.className = 'summary-therapist-cell';
            summaryCell.innerHTML = `
                <div class="summary-label">ค่ามือรวมของ${therapist.name}</div>
                <div class="summary-amount">${therapistSummary.total.toLocaleString()} ฿</div>
                <div class="summary-count">(${therapistSummary.bookingCount} การจอง)</div>
            `;
            container.appendChild(summaryCell);
        });
    }
    
    // Add current time indicator to calendar
    addCurrentTimeIndicator(container) {
        // Remove existing indicator if it exists
        if (this.currentTimeIndicator) {
            this.currentTimeIndicator.remove();
        }
        
        // Create new indicator
        this.currentTimeIndicator = this.createCurrentTimeIndicator();
        container.appendChild(this.currentTimeIndicator);
        
        // Update position immediately
        setTimeout(() => {
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
        
        // Add therapist fee info if available
        let therapistFeeDisplay = '';
        if (booking.therapistFee) {
            therapistFeeDisplay = `<div class="therapist-fee" style="color: #4c9fff; background: rgba(255,255,255,0.9); padding: 1px 4px; border-radius: 3px; font-size: 10px; margin-top: 1px;">ค่ามือ: ${booking.therapistFee.toLocaleString()}฿</div>`;
        }
        
        info.innerHTML = `
            <div>${duration} นาที.</div>
            ${serviceName ? `<div>${serviceName}</div>` : ''}
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

            // Get calendar elements  
            const calendarWithHeaders = document.getElementById('calendarWithHeaders');
            
            // Create temporary container
            const tempContainer = this.createTempContainer(currentDate, null, calendarWithHeaders);
            
            // Add to document and capture
            document.body.appendChild(tempContainer);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Configure capture options
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

            // Create canvas and download
            const canvas = await html2canvas(tempContainer, options);
            document.body.removeChild(tempContainer);
            
            this.downloadCanvas(canvas, currentDate);
            
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

    // Create temporary container for capture
    createTempContainer(currentDate, therapistHeaders, calendarGrid) {
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        tempContainer.style.background = '#ffffff';
        tempContainer.style.padding = '20px';
        tempContainer.style.fontFamily = getComputedStyle(document.body).fontFamily;
        tempContainer.style.width = 'auto';
        tempContainer.style.height = 'auto';
        
        // Add title and get calendar container
        const dateDisplay = document.getElementById('selectedDate');
        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = `<h2 style="text-align: center; margin: 0 0 20px 0; color: #1d1d1f; font-size: 24px; order: 1;">สบาย Saba-i Booking Board - ${dateDisplay.textContent}</h2>`;
        
        // Clone the unified calendar container
        const calendarWithHeaders = document.getElementById('calendarWithHeaders');
        const calendarClone = calendarWithHeaders.cloneNode(true);
        calendarClone.style.display = 'grid';
        calendarClone.style.gridTemplateColumns = calendarWithHeaders.style.gridTemplateColumns;
        calendarClone.style.gap = '0';
        calendarClone.style.margin = '0';
        calendarClone.style.width = '100%';
        calendarClone.style.boxSizing = 'border-box';
        
        // Append elements
        tempContainer.appendChild(titleDiv);
        tempContainer.appendChild(calendarClone);
        
        return tempContainer;
    }

    // Download canvas as image
    downloadCanvas(canvas, currentDate) {
        const link = document.createElement('a');
        const dateStr = SabaiUtils.formatDateKey(currentDate);
        link.download = `saba-i-calendar-${dateStr}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Export for use in other modules
window.SabaiCalendarRenderer = SabaiCalendarRenderer;