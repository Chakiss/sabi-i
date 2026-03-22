// Summary Reports Application
class SabaiReports {
    constructor() {
        this.dataService = new SabaiDataService();
        this.currentPeriod = 'today';
        this.currentStartDate = new Date();
        this.currentEndDate = new Date();
        this.bookings = [];
        this.therapists = [];
        this.services = [];
        this.charts = {};
        
        this.init();
    }

    async init() {
        console.log('🔄 Initializing Saba-i Reports...');
        
        try {
            // Load initial data
            await this.loadBaseData();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load today's report by default
            await this.loadReport('today');
            
        } catch (error) {
            console.error('❌ Error initializing reports:', error);
            this.showError('ไม่สามารถโหลดข้อมูลรายงานได้');
        }
    }

    async loadBaseData() {
        console.log('📂 Loading base data...');
        
        // Load therapists and services
        this.therapists = await this.dataService.getTherapists();
        this.services = await this.dataService.getServices();
        
        console.log('✅ Base data loaded:', {
            therapists: this.therapists.length,
            services: this.services.length
        });
    }

    setupEventListeners() {
        // Date filter buttons
        const filterBtns = document.querySelectorAll('.date-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = e.target.getAttribute('data-period');
                if (period === 'custom') {
                    this.toggleCustomDateRange();
                } else {
                    this.loadReport(period);
                }
            });
        });

        // Custom date inputs
        document.getElementById('fromDate').addEventListener('change', () => {
            this.updateCustomDateRange();
        });
        
        document.getElementById('toDate').addEventListener('change', () => {
            this.updateCustomDateRange();
        });
    }

    toggleCustomDateRange() {
        const customRange = document.getElementById('customDateRange');
        const isVisible = customRange.classList.contains('show');
        
        if (isVisible) {
            customRange.classList.remove('show');
        } else {
            customRange.classList.add('show');
            // Set default dates
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            document.getElementById('fromDate').value = this.formatDateForInput(weekAgo);
            document.getElementById('toDate').value = this.formatDateForInput(today);
        }
        
        this.setActiveButton('custom');
    }

    updateCustomDateRange() {
        const fromDate = document.getElementById('fromDate').value;
        const toDate = document.getElementById('toDate').value;
        
        if (fromDate && toDate) {
            // Auto-apply when both dates are selected
            window.applyCustomDate = () => this.applyCustomDate();
        }
    }

    async applyCustomDate() {
        const fromDate = document.getElementById('fromDate').value;
        const toDate = document.getElementById('toDate').value;
        
        if (!fromDate || !toDate) {
            alert('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด');
            return;
        }
        
        if (new Date(fromDate) > new Date(toDate)) {
            alert('วันที่เริ่มต้นต้องเป็นก่อนวันที่สิ้นสุด');
            return;
        }
        
        this.currentStartDate = new Date(fromDate);
        this.currentEndDate = new Date(toDate + 'T23:59:59');
        this.currentPeriod = 'custom';
        
        const periodText = `${this.formatDisplayDate(this.currentStartDate)} - ${this.formatDisplayDate(this.currentEndDate)}`;
        document.getElementById('reportPeriodText').textContent = `รายงาน ${periodText}`;
        
        await this.generateReport();
    }

    async loadReport(period) {
        console.log('📊 Loading report for period:', period);
        
        this.currentPeriod = period;
        this.setActiveButton(period);
        this.setDateRange(period);
        
        // Update period text
        document.getElementById('reportPeriodText').textContent = this.getPeriodText(period);
        
        await this.generateReport();
    }

    setActiveButton(period) {
        document.querySelectorAll('.date-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-period="${period}"]`).classList.add('active');
        
        // Hide custom date range if not custom
        if (period !== 'custom') {
            document.getElementById('customDateRange').classList.remove('show');
        }
    }

    setDateRange(period) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (period) {
            case 'today':
                this.currentStartDate = new Date(today);
                this.currentEndDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
                break;
                
            case '7days':
                this.currentStartDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
                this.currentEndDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
                break;
                
            case '30days':
                this.currentStartDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
                this.currentEndDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
                break;
                
            case 'thisweek':
                const dayOfWeek = today.getDay();
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                this.currentStartDate = new Date(today.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
                this.currentEndDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
                break;
                
            case 'thismonth':
                this.currentStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
                this.currentEndDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
                break;
        }
        
        console.log('📅 Date range set for period:', period);
        console.log('📅 Start date:', this.currentStartDate.toLocaleDateString('th-TH'));
        console.log('📅 End date:', this.currentEndDate.toLocaleDateString('th-TH'));
        console.log('📅 Date range details:', {
            start: this.currentStartDate,
            end: this.currentEndDate,
            startDateKey: SabaiUtils.formatDateKey(this.currentStartDate),
            endDateKey: SabaiUtils.formatDateKey(this.currentEndDate)
        });
    }

    getPeriodText(period) {
        switch (period) {
            case 'today': return 'รายงานวันนี้';
            case '7days': return 'รายงาน 7 วันที่แล้ว';
            case '30days': return 'รายงาน 30 วันที่แล้ว';
            case 'thisweek': return 'รายงานสัปดาห์นี้';
            case 'thismonth': return 'รายงานเดือนนี้';
            default: return 'รายงาน';
        }
    }

    async generateReport() {
        console.log('🔄 Generating report...');
        
        // Show loading
        this.showLoading(true);
        
        try {
            // Load bookings for the selected period
            await this.loadBookingsForPeriod();
            
            // Generate all reports
            this.generateSummaryCards();
            this.generateRevenueByTherapist();
            this.generateFeeByTherapist();
            this.generateBookingsByTherapist();
            this.generatePopularServices();
            this.generatePeakHours();
            this.generateDayOfWeekAnalysis();
            this.generateTherapistServicesBreakdown();
            
            // Show results
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ Error generating report:', error);
            this.showError('ไม่สามารถสร้างรายงานได้');
        }
    }

    async loadBookingsForPeriod() {
        console.log('📚 Loading bookings for period...');
        console.log('📚 Date range:', {
            start: this.currentStartDate.toLocaleDateString('th-TH'),
            end: this.currentEndDate.toLocaleDateString('th-TH')
        });
        
        // Generate all date keys in the range
        const dateKeys = [];
        const currentDate = new Date(this.currentStartDate);
        
        while (currentDate <= this.currentEndDate) {
            const dateKey = SabaiUtils.formatDateKey(currentDate);
            dateKeys.push(dateKey);
            console.log('📅 Added date key:', dateKey, 'for date:', currentDate.toLocaleDateString('th-TH'));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log('📅 All date keys to load:', dateKeys);
        
        // Load bookings for all dates
        this.bookings = [];
        let totalLoadedDays = 0;
        let daysWithData = 0;
        
        for (const dateKey of dateKeys) {
            try {
                console.log(`📚 Loading bookings for date: ${dateKey}`);
                const dayBookings = await this.dataService.getBookingsByDate(new Date(dateKey + 'T00:00:00'));
                if (dayBookings && dayBookings.length > 0) {
                    console.log(`✅ Found ${dayBookings.length} bookings for ${dateKey}`);
                    this.bookings.push(...dayBookings);
                    daysWithData++;
                } else {
                    console.log(`📭 No bookings found for ${dateKey}`);
                }
                totalLoadedDays++;
            } catch (error) {
                console.error(`❌ Failed to load bookings for ${dateKey}:`, error);
            }
        }
        
        console.log('✅ Loading summary:', {
            totalDaysRequested: dateKeys.length,
            totalDaysLoaded: totalLoadedDays,
            daysWithData: daysWithData,
            totalBookings: this.bookings.length
        });
        
        // If no bookings found, show helpful message
        if (this.bookings.length === 0) {
            console.warn('⚠️ No bookings found for the selected period');
            console.warn('💡 This could be because:');
            console.warn('   - No bookings exist for these dates');
            console.warn('   - Date format mismatch');
            console.warn('   - Database connection issues');
            console.warn('📋 Searched date keys:', dateKeys);
        }
    }

    generateSummaryCards() {
        const totalRevenue = this.calculateTotalRevenue();
        const totalTherapistFee = this.calculateTotalTherapistFee();
        const totalBookings = this.bookings.length;
        const avgTransaction = totalBookings > 0 ? totalRevenue / totalBookings : 0;
        
        document.getElementById('totalRevenue').textContent = `${totalRevenue.toLocaleString()} ฿`;
        document.getElementById('totalTherapistFee').textContent = `${totalTherapistFee.toLocaleString()} ฿`;
        document.getElementById('totalBookings').textContent = totalBookings.toLocaleString();
        document.getElementById('avgTransaction').textContent = `${Math.round(avgTransaction).toLocaleString()} ฿`;
        
        // Log summary for debugging
        console.log('📊 Summary generated:', {
            totalBookings,
            totalRevenue,
            totalTherapistFee,
            avgTransaction
        });
        
        // Show helpful message if no data
        if (totalBookings === 0) {
            console.warn('📊 No bookings data available for summary cards');
        }
    }

    calculateTotalRevenue() {
        return this.bookings.reduce((total, booking) => {
            const price = booking.price || 0;
            const discount = booking.discount || 0;
            const finalPrice = price * (1 - discount / 100);
            return total + finalPrice;
        }, 0);
    }

    calculateTotalTherapistFee() {
        return this.bookings.reduce((total, booking) => {
            return total + (booking.therapistFee || 0);
        }, 0);
    }

    generateRevenueByTherapist() {
        const revenueByTherapist = {};
        
        this.bookings.forEach(booking => {
            const therapistId = booking.therapistId;
            const therapist = this.therapists.find(t => t.id === therapistId);
            const therapistName = therapist ? therapist.name : 'ไม่ทราบ';
            
            if (!revenueByTherapist[therapistName]) {
                revenueByTherapist[therapistName] = 0;
            }
            
            const price = booking.price || 0;
            const discount = booking.discount || 0;
            const finalPrice = price * (1 - discount / 100);
            revenueByTherapist[therapistName] += finalPrice;
        });
        
        const ctx = document.getElementById('revenueByTherapistChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.revenueByTherapist) {
            this.charts.revenueByTherapist.destroy();
        }
        
        this.charts.revenueByTherapist = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(revenueByTherapist),
                datasets: [{
                    data: Object.values(revenueByTherapist),
                    backgroundColor: [
                        '#4c9fff', '#2196f3', '#03a9f4', '#00bcd4',
                        '#009688', '#4caf50', '#8bc34a', '#cddc39',
                        '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                return context.label + ': ' + value.toLocaleString() + ' ฿';
                            }
                        }
                    }
                }
            }
        });
    }

    generateFeeByTherapist() {
        const feeByTherapist = {};
        
        this.bookings.forEach(booking => {
            const therapistId = booking.therapistId;
            const therapist = this.therapists.find(t => t.id === therapistId);
            const therapistName = therapist ? therapist.name : 'ไม่ทราบ';
            
            if (!feeByTherapist[therapistName]) {
                feeByTherapist[therapistName] = 0;
            }
            
            feeByTherapist[therapistName] += booking.therapistFee || 0;
        });
        
        const ctx = document.getElementById('feeByTherapistChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.feeByTherapist) {
            this.charts.feeByTherapist.destroy();
        }
        
        this.charts.feeByTherapist = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(feeByTherapist),
                datasets: [{
                    label: 'ค่ามือหมอ (฿)',
                    data: Object.values(feeByTherapist),
                    backgroundColor: 'rgba(76, 159, 255, 0.8)',
                    borderColor: 'rgba(76, 159, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + ' ฿';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'ค่ามือหมอ: ' + context.parsed.y.toLocaleString() + ' ฿';
                            }
                        }
                    }
                }
            }
        });

        // Generate table for therapist fees
        const sortedTherapists = Object.entries(feeByTherapist)
            .sort(([,a], [,b]) => b - a);
        
        const totalFee = Object.values(feeByTherapist).reduce((sum, fee) => sum + fee, 0);
        
        let tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>หมอนวด</th>
                        <th>ค่ามือ (฿)</th>
                        <th>เปอร์เซ็นต์</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedTherapists.forEach(([therapistName, fee]) => {
            const percentage = totalFee > 0 ? (fee / totalFee) * 100 : 0;
            tableHTML += `
                <tr>
                    <td>${therapistName}</td>
                    <td>${fee.toLocaleString()} ฿</td>
                    <td>
                        <div class="percentage-bar">
                            <div class="percentage-fill" style="width: ${percentage}%"></div>
                        </div>
                        ${percentage.toFixed(1)}%
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                <tr style="border-top: 2px solid #ddd; font-weight: bold; background: #f8f9fa;">
                    <td>รวมทั้งหมด</td>
                    <td>${totalFee.toLocaleString()} ฿</td>
                    <td>100%</td>
                </tr>
            </tbody></table>
        `;
        
        if (sortedTherapists.length === 0) {
            tableHTML = '<div class="no-data">ไม่มีข้อมูลค่ามือหมอ</div>';
        }
        
        document.getElementById('feeByTherapistTable').innerHTML = tableHTML;
    }

    generateBookingsByTherapist() {
        const bookingsByTherapist = {};
        
        this.bookings.forEach(booking => {
            const therapistId = booking.therapistId;
            const therapist = this.therapists.find(t => t.id === therapistId);
            const therapistName = therapist ? therapist.name : 'ไม่ทราบ';
            
            bookingsByTherapist[therapistName] = (bookingsByTherapist[therapistName] || 0) + 1;
        });
        
        const sortedTherapists = Object.entries(bookingsByTherapist)
            .sort(([,a], [,b]) => b - a);
        
        const maxBookings = Math.max(...Object.values(bookingsByTherapist));
        
        let tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>หมอนวด</th>
                        <th>จำนวนการจอง</th>
                        <th>เปอร์เซ็นต์</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedTherapists.forEach(([therapistName, count]) => {
            const percentage = maxBookings > 0 ? (count / maxBookings) * 100 : 0;
            tableHTML += `
                <tr>
                    <td>${therapistName}</td>
                    <td>${count}</td>
                    <td>
                        <div class="percentage-bar">
                            <div class="percentage-fill" style="width: ${percentage}%"></div>
                        </div>
                        ${percentage.toFixed(1)}%
                    </td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        
        if (sortedTherapists.length === 0) {
            tableHTML = '<div class="no-data">ไม่มีข้อมูลการจอง</div>';
        }
        
        document.getElementById('bookingsByTherapistTable').innerHTML = tableHTML;
    }

    generatePopularServices() {
        const serviceBookings = {};
        
        this.bookings.forEach(booking => {
            if (booking.serviceId) {
                const service = this.services.find(s => s.id === booking.serviceId);
                const serviceName = service ? service.name : 'ไม่ทราบ';
                
                if (!serviceBookings[serviceName]) {
                    serviceBookings[serviceName] = { count: 0, revenue: 0 };
                }
                
                serviceBookings[serviceName].count++;
                const price = booking.price || 0;
                const discount = booking.discount || 0;
                const finalPrice = price * (1 - discount / 100);
                serviceBookings[serviceName].revenue += finalPrice;
            }
        });
        
        const sortedServices = Object.entries(serviceBookings)
            .sort(([,a], [,b]) => b.count - a.count);
        
        let tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>บริการ</th>
                        <th>จำนวนครั้ง</th>
                        <th>รายได้รวม</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedServices.slice(0, 10).forEach(([serviceName, data]) => {
            tableHTML += `
                <tr>
                    <td>${serviceName}</td>
                    <td>${data.count}</td>
                    <td>${data.revenue.toLocaleString()} ฿</td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        
        if (sortedServices.length === 0) {
            tableHTML = '<div class="no-data">ไม่มีข้อมูลบริการ</div>';
        }
        
        document.getElementById('popularServicesTable').innerHTML = tableHTML;
    }

    generatePeakHours() {
        const hourlyBookings = {};
        
        // Initialize hours
        for (let hour = 10; hour <= 22; hour++) {
            hourlyBookings[hour] = 0;
        }
        
        this.bookings.forEach(booking => {
            if (booking.startTime && booking.startTime.seconds) {
                const startDate = new Date(booking.startTime.seconds * 1000);
                const hour = startDate.getHours();
                if (hourlyBookings[hour] !== undefined) {
                    hourlyBookings[hour]++;
                }
            }
        });
        
        const ctx = document.getElementById('peakHoursChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.peakHours) {
            this.charts.peakHours.destroy();
        }
        
        this.charts.peakHours = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(hourlyBookings).map(hour => `${hour}:00`),
                datasets: [{
                    label: 'จำนวนการจอง',
                    data: Object.values(hourlyBookings),
                    borderColor: '#4c9fff',
                    backgroundColor: 'rgba(76, 159, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    generateDayOfWeekAnalysis() {
        const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        const dayBookings = [0, 0, 0, 0, 0, 0, 0];
        
        this.bookings.forEach(booking => {
            if (booking.startTime && booking.startTime.seconds) {
                const startDate = new Date(booking.startTime.seconds * 1000);
                const dayOfWeek = startDate.getDay();
                dayBookings[dayOfWeek]++;
            }
        });
        
        const ctx = document.getElementById('dayOfWeekChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.dayOfWeek) {
            this.charts.dayOfWeek.destroy();
        }
        
        this.charts.dayOfWeek = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dayNames,
                datasets: [{
                    label: 'จำนวนการจอง',
                    data: dayBookings,
                    backgroundColor: dayNames.map((_, index) => {
                        const max = Math.max(...dayBookings);
                        const min = Math.min(...dayBookings);
                        if (dayBookings[index] === max) return '#4caf50';
                        if (dayBookings[index] === min) return '#f44336';
                        return 'rgba(76, 159, 255, 0.8)';
                    }),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    generateTherapistServicesBreakdown() {
        const therapistServices = {};
        
        this.bookings.forEach(booking => {
            if (booking.serviceId) {
                const therapistId = booking.therapistId;
                const therapist = this.therapists.find(t => t.id === therapistId);
                const therapistName = therapist ? therapist.name : 'ไม่ทราบ';
                
                const service = this.services.find(s => s.id === booking.serviceId);
                const serviceName = service ? service.name : 'ไม่ทราบ';
                
                const key = `${therapistName} - ${serviceName}`;
                therapistServices[key] = (therapistServices[key] || 0) + 1;
            }
        });
        
        const sortedTherapistServices = Object.entries(therapistServices)
            .sort(([,a], [,b]) => b - a);
        
        let tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>หมอนวด - บริการ</th>
                        <th>จำนวนครั้ง</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedTherapistServices.slice(0, 15).forEach(([combination, count]) => {
            tableHTML += `
                <tr>
                    <td>${combination}</td>
                    <td>${count}</td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        
        if (sortedTherapistServices.length === 0) {
            tableHTML = '<div class="no-data">ไม่มีข้อมูลการใช้บริการ</div>';
        }
        
        document.getElementById('therapistServicesTable').innerHTML = tableHTML;
    }

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        const reportsGrid = document.getElementById('reportsGrid');
        const detailedReports = document.getElementById('detailedReports');
        
        if (show) {
            loadingState.style.display = 'flex';
            reportsGrid.style.display = 'none';
            detailedReports.style.display = 'none';
        } else {
            loadingState.style.display = 'none';
            reportsGrid.style.display = 'grid';
            detailedReports.style.display = 'grid';
            
            // If no bookings, show a friendly message
            if (this.bookings.length === 0) {
                this.showNoDataMessage();
            }
        }
    }

    showNoDataMessage() {
        // Add a temporary message overlay
        const overlay = document.createElement('div');
        overlay.id = 'noDataOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.1);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(2px);
        `;
        
        overlay.innerHTML = `
            <div style="
                background: white;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 15px 40px rgba(0,0,0,0.15);
                text-align: center;
                max-width: 500px;
                margin: 20px;
            ">
                <h3 style="color: #666; margin-bottom: 20px; font-size: 1.5rem;">
                    📭 ไม่มีข้อมูลในช่วงเวลานี้
                </h3>
                <p style="color: #999; margin-bottom: 25px; line-height: 1.5;">
                    ไม่พบข้อมูลการจองในช่วงเวลาที่เลือก<br>
                    ลองเลือกช่วงเวลาอื่น หรือตรวจสอบว่ามีการจองในระบบแล้ว
                </p>
                <button onclick="document.getElementById('noDataOverlay').remove()" 
                        style="
                            background: #4c9fff;
                            color: white;
                            border: none;
                            padding: 12px 25px;
                            border-radius: 25px;
                            cursor: pointer;
                            font-size: 1rem;
                            transition: background 0.3s;
                        ">
                    เข้าใจแล้ว
                </button>
            </div>
        `;
        
        // Remove existing overlay if any
        const existing = document.getElementById('noDataOverlay');
        if (existing) existing.remove();
        
        document.body.appendChild(overlay);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const overlayElement = document.getElementById('noDataOverlay');
            if (overlayElement) overlayElement.remove();
        }, 5000);
    }

    showError(message) {
        this.showLoading(false);
        alert(message); // Simple error display - can be enhanced
    }

    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDisplayDate(date) {
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Make applyCustomDate available globally
window.applyCustomDate = function() {
    if (window.reportsApp) {
        window.reportsApp.applyCustomDate();
    }
};