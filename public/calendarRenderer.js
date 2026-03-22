// Calendar Rendering and Display Logic
class SabaiCalendarRenderer {
    constructor(dataService, app) {
        this.dataService = dataService;
        this.app = app; // Store app reference
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
        
        // Set grid layout with consistent column sizing
        const columnTemplate = this.generateGridColumns(activeTherapists.length);
        container.style.gridTemplateColumns = columnTemplate;
        container.style.width = '100%';
        container.style.maxWidth = '100vw';
        container.style.boxSizing = 'border-box';
        
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
        
        // Calculate price from booking.price or service pricing
        let displayPrice = booking.price;
        if (!displayPrice && booking.serviceId && services) {
            // Find service and get price for duration
            const service = services.find(s => s.id === booking.serviceId);
            if (service && service.durations) {
                const durationOption = service.durations.find(d => d.duration === duration);
                if (durationOption) {
                    displayPrice = durationOption.price;
                }
            }
        }
        
        let priceDisplay = '';
        if (displayPrice) {
            priceDisplay = `<div class="price" style="color: #333; background: rgba(255,255,255,0.9); padding: 2px 6px; border-radius: 3px; font-weight: bold; margin-top: 2px;">${displayPrice}฿</div>`;
        }
        
        info.innerHTML = `
            <div>${duration} นาที.</div>
            ${serviceName ? `<div>${serviceName}</div>` : ''}
            ${priceDisplay}
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