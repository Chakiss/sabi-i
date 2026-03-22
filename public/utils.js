// Utility Functions
class SabaiUtils {
    // Date formatting utilities
    static formatDateKey(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static formatDisplayDate(date) {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        };
        return date.toLocaleDateString('th-TH', options);
    }

    static formatTimeFromDate(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Time utilities
    static initializeTimeSlots() {
        const timeSlots = [];
        const start = CONFIG.SHOP_START_HOUR;
        const end = CONFIG.SHOP_END_HOUR;
        
        console.log('🕐 Initializing time slots:', { start, end });
        
        for (let hour = start; hour <= end; hour++) {
            for (let minute = 0; minute < 60; minute += CONFIG.SLOT_DURATION) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                timeSlots.push(timeString);
                console.log('➕ Added time slot:', timeString);
            }
        }
        
        console.log('✅ Final time slots:', timeSlots);
        console.log('⏰ Last slot:', timeSlots[timeSlots.length - 1]);
        
        return timeSlots;
    }

    static getTimeRange(startTime) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const endMinutes = minutes + CONFIG.SLOT_DURATION;
        const endHours = hours + Math.floor(endMinutes / 60);
        const adjustedEndMinutes = endMinutes % 60;
        
        const endTime = `${endHours.toString().padStart(2, '0')}:${adjustedEndMinutes.toString().padStart(2, '0')}`;
        return `${startTime} - ${endTime}`;
    }

    static parseTimeSlot(timeSlot, currentDate) {
        const [hours, minutes] = timeSlot.split(':').map(Number);
        const date = new Date(currentDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    static addMinutes(timeString, minutes) {
        if (!timeString || !minutes) return timeString;
        
        const [hours, mins] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, mins, 0, 0);
        
        // Add minutes
        date.setMinutes(date.getMinutes() + minutes);
        
        // Format back to HH:MM
        const newHours = date.getHours().toString().padStart(2, '0');
        const newMins = date.getMinutes().toString().padStart(2, '0');
        
        return `${newHours}:${newMins}`;
    }

    // Color utilities
    static getBookingColor(bookingId) {
        let hash = 0;
        for (let i = 0; i < bookingId.length; i++) {
            const char = bookingId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        const tones = [210, 270, 150, 30, 180, 320, 60, 190];
        return tones[Math.abs(hash) % 8];
    }

    // Payment method utilities
    static getPaymentMethodText(paymentMethod) {
        if (!paymentMethod) return null;
        const paymentMethods = {
            'transfer': '💳 โอน',
            'cash': '💵 สด'
        };
        return paymentMethods[paymentMethod] || null;
    }

    // Duration calculation
    static calculateDuration(startTime, endTime) {
        const start = new Date(startTime.seconds * 1000);
        const end = new Date(endTime.seconds * 1000);
        return Math.round((end - start) / (1000 * 60));
    }

    // Generate booking ID
    static generateBookingId() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const date = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        
        return `B${year}${month}${date}${hours}${minutes}${seconds}`;
    }

    // Validation utilities
    static validateBookingData(data) {
        if (!data.therapistId || !data.startTime || !data.endTime) {
            return { isValid: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
        }
        
        if (data.endTime <= data.startTime) {
            return { isValid: false, message: 'เวลาสิ้นสุดต้องหลังจากเวลาเริ่มต้น' };
        }
        
        const startHour = data.startTime.getHours();
        const endHour = data.endTime.getHours();
        const endMinutes = data.endTime.getMinutes();
        
        if (startHour < CONFIG.SHOP_START_HOUR || 
            (endHour > CONFIG.SHOP_END_HOUR) || 
            (endHour === CONFIG.SHOP_END_HOUR && endMinutes > 0)) {
            return { isValid: false, message: `การจองต้องอยู่ในช่วงเวลา ${CONFIG.SHOP_START_HOUR}:00 - ${CONFIG.SHOP_END_HOUR}:00` };
        }
        
        return { isValid: true };
    }
}

// Export for use in other modules
window.SabaiUtils = SabaiUtils;