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
        const filterBtns = document.querySelectorAll('.filter-btn[data-period]');
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
        document.querySelectorAll('.filter-btn[data-period]').forEach(btn => {
            btn.classList.remove('active');
        });

        const target = document.querySelector(`.filter-btn[data-period="${period}"]`);
        if (target) target.classList.add('active');
        
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

    destroyAllCharts() {
        console.log('🗑️ Destroying existing charts...');
        Object.keys(this.charts).forEach(chartName => {
            if (this.charts[chartName] instanceof Chart) {
                try {
                    this.charts[chartName].destroy();
                    console.log(`✅ Destroyed chart: ${chartName}`);
                } catch (error) {
                    console.warn(`⚠️ Error destroying chart ${chartName}:`, error);
                }
                this.charts[chartName] = null;
            }
        });
        this.charts = {};
    }

    async generateReport() {
        console.log('🔄 Generating report...');
        
        // Show loading
        this.showLoading(true);
        
        try {
            // Load bookings for the selected period
            await this.loadBookingsForPeriod();
            
            // Destroy all existing charts before creating new ones
            this.destroyAllCharts();
            
            // Generate all reports
            this.generateSummaryCards();
            this.generateRevenueByTherapist();
            this.generateFeeByTherapist();
            this.generateBookingsByTherapist();
            this.generatePopularServices();
            this.generatePeakHours();
            this.generateDayOfWeekAnalysis();
            this.generateTherapistServicesBreakdown();
            this.generateTherapistUtilization();
            
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
        const netProfit = totalRevenue - totalTherapistFee;

        document.getElementById('totalRevenue').textContent = `${Math.round(totalRevenue).toLocaleString()} ฿`;
        document.getElementById('totalTherapistFee').textContent = `${Math.round(totalTherapistFee).toLocaleString()} ฿`;
        document.getElementById('netProfit').textContent = `${Math.round(netProfit).toLocaleString()} ฿`;
        document.getElementById('totalBookings').textContent = totalBookings.toLocaleString();
        document.getElementById('avgTransaction').textContent = `${Math.round(avgTransaction).toLocaleString()} ฿`;
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
        if (this.charts.revenueByTherapist instanceof Chart) {
            this.charts.revenueByTherapist.destroy();
            this.charts.revenueByTherapist = null;
        }
        
        this.charts.revenueByTherapist = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(revenueByTherapist),
                datasets: [{
                    data: Object.values(revenueByTherapist),
                    backgroundColor: [
                        '#FF6B6B', // แดงอมชมพู
                        '#4ECDC4', // เขียวอมฟ้า
                        '#45B7D1', // น้ำเงินสด
                        '#96CEB4', // เขียวอ่อน
                        '#FECA57', // เหลืองสด
                        '#FF9FF3', // ชมพูสด
                        '#54A0FF', // ฟ้าสด
                        '#5F27CD', // ม่วงเข้ม
                        '#00D2D3', // เขียวมิ้นต์
                        '#FF9F43', // ส้มสด
                        '#EE5A6F', // แดงสด
                        '#C44569'  // แดงม่วง
                    ],
                    borderWidth: 0,
                    hoverBorderWidth: 3,
                    hoverBorderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        caretPadding: 10,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return context.label + ': ' + value.toLocaleString() + ' ฿ (' + percentage + '%)';
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
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
        if (this.charts.feeByTherapist instanceof Chart) {
            this.charts.feeByTherapist.destroy();
            this.charts.feeByTherapist = null;
        }
        
        this.charts.feeByTherapist = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(feeByTherapist),
                datasets: [{
                    label: 'ค่ามือหมอ (฿)',
                    data: Object.values(feeByTherapist),
                    backgroundColor: [
                        '#FF6B6B', // แดงอมชมพู
                        '#4ECDC4', // เขียวอมฟ้า
                        '#45B7D1', // น้ำเงินสด
                        '#96CEB4', // เขียวอ่อน
                        '#FECA57', // เหลืองสด
                        '#FF9FF3', // ชมพูสด
                        '#54A0FF', // ฟ้าสด
                        '#5F27CD', // ม่วงเข้ม
                        '#00D2D3', // เขียวมิ้นต์
                        '#FF9F43', // ส้มสด
                        '#EE5A6F', // แดงสด
                        '#C44569'  // แดงม่วง
                    ],
                    borderColor: [
                        '#FF5252', '#26A69A', '#2196F3', '#66BB6A',
                        '#FFA726', '#EC407A', '#42A5F5', '#7E57C2',
                        '#26C6DA', '#FF7043', '#EF5350', '#AB47BC'
                    ],
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + ' ฿';
                            },
                            font: {
                                weight: '500'
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                weight: '500'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        caretPadding: 10,
                        callbacks: {
                            label: function(context) {
                                return 'ค่ามือหมอ: ' + context.parsed.y.toLocaleString() + ' ฿';
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutBounce'
                }
            }
        });

        // Generate table for therapist fees
        const sortedTherapists = Object.entries(feeByTherapist)
            .sort(([,a], [,b]) => b - a);
        
        const totalFee = Object.values(feeByTherapist).reduce((sum, fee) => sum + fee, 0);
        
        let tableHTML = `
            <table class="dt">
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
                        <div class="pbar-wrap">
                            <div class="pbar-fill" style="width: ${percentage}%"></div>
                        </div>
                        ${percentage.toFixed(1)}%
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                <tr class="total-row">
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
            <table class="dt">
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
                        <div class="pbar-wrap">
                            <div class="pbar-fill" style="width: ${percentage}%"></div>
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
            <table class="dt">
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
        if (this.charts.peakHours instanceof Chart) {
            this.charts.peakHours.destroy();
            this.charts.peakHours = null;
        }
        
        this.charts.peakHours = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(hourlyBookings).map(hour => `${hour}:00`),
                datasets: [{
                    label: 'จำนวนการจอง',
                    data: Object.values(hourlyBookings),
                    borderColor: '#FF6B6B',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 4,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#FF6B6B',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#FF5252',
                    pointHoverBorderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            stepSize: 1,
                            font: {
                                weight: '500'
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                weight: '500'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        caretPadding: 10,
                        callbacks: {
                            label: function(context) {
                                const count = context.parsed.y;
                                return `เวลา ${context.label}: ${count} การจอง`;
                            },
                            afterLabel: function(context) {
                                const data = context.dataset.data;
                                const max = Math.max(...data);
                                if (context.parsed.y === max && max > 0) return `🚀 Peak Hour!`;
                                return '';
                            }
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                },
                elements: {
                    line: {
                        capBezierPoints: false
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
        if (this.charts.dayOfWeek instanceof Chart) {
            this.charts.dayOfWeek.destroy();
            this.charts.dayOfWeek = null;
        }
        
        this.charts.dayOfWeek = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dayNames,
                datasets: [{
                    label: 'จำนวนการจอง',
                    data: dayBookings,
                    backgroundColor: dayNames.map((_, index) => {
                        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
                        const max = Math.max(...dayBookings);
                        const min = Math.min(...dayBookings);
                        if (dayBookings[index] === max && max > 0) return '#4CAF50'; // เขียวสำหรับค่าที่มากที่สุด
                        if (dayBookings[index] === min && dayBookings.some(x => x > 0)) return '#F44336'; // แดงสำหรับค่าที่น้อยที่สุด
                        return colors[index % colors.length];
                    }),
                    borderColor: dayNames.map((_, index) => {
                        const borders = ['#FF5252', '#26A69A', '#2196F3', '#66BB6A', '#FFA726', '#EC407A', '#42A5F5'];
                        const max = Math.max(...dayBookings);
                        const min = Math.min(...dayBookings);
                        if (dayBookings[index] === max && max > 0) return '#388E3C';
                        if (dayBookings[index] === min && dayBookings.some(x => x > 0)) return '#D32F2F';
                        return borders[index % borders.length];
                    }),
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            stepSize: 1,
                            font: {
                                weight: '500'
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                weight: '500'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        caretPadding: 10,
                        callbacks: {
                            afterLabel: function(context) {
                                const data = context.dataset.data;
                                const max = Math.max(...data);
                                const min = Math.min(...data.filter(x => x > 0));
                                if (context.parsed.y === max && max > 0) return '🔥 วันที่คนมากที่สุด';
                                if (context.parsed.y === min && data.some(x => x > 0)) return '📉 วันที่คนน้อยที่สุด';
                                return '';
                            }
                        }
                    }
                },
                animation: {
                    duration: 1200,
                    easing: 'easeOutElastic'
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
            <table class="dt">
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
        const dashContent = document.getElementById('dashContent');

        if (show) {
            loadingState.style.display = 'flex';
            dashContent.style.display = 'none';
        } else {
            loadingState.style.display = 'none';
            dashContent.style.display = 'flex';

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

    generateTherapistUtilization() {
        const therapistWorkHours = {};
        const totalAvailableHours = 12; // 10 AM to 10 PM
        
        // Calculate actual working hours per therapist
        this.bookings.forEach(booking => {
            const therapistId = booking.therapistId;
            const therapist = this.therapists.find(t => t.id === therapistId);
            const therapistName = therapist ? therapist.name : 'ไม่ทราบ';
            
            if (!therapistWorkHours[therapistName]) {
                therapistWorkHours[therapistName] = 0;
            }
            
            const duration = booking.duration || 60;
            therapistWorkHours[therapistName] += duration / 60; // Convert to hours
        });
        
        // Calculate utilization rate for each therapist
        const utilizationData = Object.entries(therapistWorkHours).map(([name, hours]) => {
            const daysInPeriod = Math.ceil((this.currentEndDate - this.currentStartDate) / (1000 * 60 * 60 * 24));
            const totalPossibleHours = totalAvailableHours * daysInPeriod;
            const utilizationRate = (hours / totalPossibleHours) * 100;
            
            return {
                name,
                hours: hours.toFixed(1),
                utilizationRate: Math.min(utilizationRate, 100).toFixed(1)
            };
        });
        
        utilizationData.sort((a, b) => parseFloat(b.utilizationRate) - parseFloat(a.utilizationRate));
        
        const ctx = document.getElementById('therapistUtilizationChart').getContext('2d');
        
        // Destroy existing chart properly
        if (this.charts.therapistUtilization instanceof Chart) {
            this.charts.therapistUtilization.destroy();
            this.charts.therapistUtilization = null;
        }
        
        this.charts.therapistUtilization = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: utilizationData.map(d => d.name),
                datasets: [{
                    label: 'อัตราการใช้งาน (%)',
                    data: utilizationData.map(d => parseFloat(d.utilizationRate)),
                    backgroundColor: utilizationData.map(d => {
                        const rate = parseFloat(d.utilizationRate);
                        if (rate >= 80) return '#4CAF50'; // Green for high utilization
                        if (rate >= 60) return '#FF9800'; // Orange for medium
                        return '#F44336'; // Red for low utilization
                    }),
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
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
                                const data = utilizationData[context.dataIndex];
                                return `อัตราการใช้งาน: ${data.utilizationRate}% (${data.hours} ชั่วโมง)`;
                            }
                        }
                    }
                }
            }
        });
        
        // Generate summary
        let summaryHTML = '';
        utilizationData.forEach(data => {
            const rate = parseFloat(data.utilizationRate);
            const badgeClass = rate >= 80 ? 'badge-high' : rate >= 60 ? 'badge-medium' : 'badge-low';
            const label = rate >= 80 ? 'สูง' : rate >= 60 ? 'ปานกลาง' : 'ต่ำ';
            summaryHTML += `
                <div class="util-row">
                    <span>${data.name} — ${data.hours} ชม.</span>
                    <span class="util-badge ${badgeClass}">${data.utilizationRate}% ${label}</span>
                </div>`;
        });
        document.getElementById('utilizationSummary').innerHTML = summaryHTML;
    }

    generatePeakStaffingAnalysis() {
        const hourlyDemand = {};
        const hourlyTherapists = {};
        
        // Initialize hours
        for (let hour = 10; hour <= 22; hour++) {
            hourlyDemand[hour] = 0;
            hourlyTherapists[hour] = new Set();
        }
        
        this.bookings.forEach(booking => {
            if (booking.startTime && booking.startTime.seconds) {
                const startDate = new Date(booking.startTime.seconds * 1000);
                const hour = startDate.getHours();
                
                if (hourlyDemand[hour] !== undefined) {
                    hourlyDemand[hour]++;
                    hourlyTherapists[hour].add(booking.therapistId);
                }
            }
        });
        
        const staffingData = Object.keys(hourlyDemand).map(hour => ({
            hour: `${hour}:00`,
            demand: hourlyDemand[hour],
            therapists: hourlyTherapists[hour].size,
            ratio: hourlyTherapists[hour].size > 0 ? 
                   (hourlyDemand[hour] / hourlyTherapists[hour].size).toFixed(1) : 0
        }));
        
        const ctx = document.getElementById('peakStaffingChart').getContext('2d');
        
        if (this.charts.peakStaffing instanceof Chart) {
            this.charts.peakStaffing.destroy();
            this.charts.peakStaffing = null;
        }
        
        this.charts.peakStaffing = new Chart(ctx, {
            type: 'line',
            data: {
                labels: staffingData.map(d => d.hour),
                datasets: [
                    {
                        label: 'ความต้องการ (การจอง)',
                        data: staffingData.map(d => d.demand),
                        borderColor: '#FF6B6B',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        yAxisID: 'y'
                    },
                    {
                        label: 'จำนวนหมอที่ทำงาน',
                        data: staffingData.map(d => d.therapists),
                        borderColor: '#4ECDC4',
                        backgroundColor: 'rgba(78, 205, 196, 0.1)',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'จำนวนการจอง'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'จำนวนหมอ'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            afterBody: function(context) {
                                const index = context[0].dataIndex;
                                const ratio = staffingData[index].ratio;
                                return `อัตราส่วน: ${ratio} การจอง/หมอ`;
                            }
                        }
                    }
                }
            }
        });
        
        // Generate recommendations
        const peakHours = staffingData.filter(d => parseFloat(d.ratio) > 1.5);
        let recommendationsHTML = `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
                <h4 style="margin-bottom: 10px; color: #1976d2;">💡 คำแนะนำการจัดพนักงาน</h4>
        `;
        
        if (peakHours.length > 0) {
            recommendationsHTML += '<p><strong>ช่วงเวลาที่ต้องเพิ่มหมอ:</strong></p><ul>';
            peakHours.forEach(hour => {
                recommendationsHTML += `<li>${hour.hour} - อัตราส่วน ${hour.ratio} การจอง/หมอ</li>`;
            });
            recommendationsHTML += '</ul>';
        } else {
            recommendationsHTML += '<p>✅ การจัดพนักงานเหมาะสมในช่วงเวลาทั้งหมด</p>';
        }
        
        recommendationsHTML += '</div>';
        document.getElementById('staffingRecommendations').innerHTML = recommendationsHTML;
    }

    generateServiceROIAnalysis() {
        const serviceROI = {};
        
        this.bookings.forEach(booking => {
            if (booking.serviceId && booking.price) {
                const service = this.services.find(s => s.id === booking.serviceId);
                const serviceName = service ? service.name : 'ไม่ระบุ';
                
                if (!serviceROI[serviceName]) {
                    serviceROI[serviceName] = {
                        revenue: 0,
                        cost: 0,
                        count: 0,
                        duration: 0
                    };
                }
                
                const revenue = booking.price * (1 - (booking.discount || 0) / 100);
                const therapistCost = booking.therapistFee || 0;
                
                serviceROI[serviceName].revenue += revenue;
                serviceROI[serviceName].cost += therapistCost;
                serviceROI[serviceName].count += 1;
                serviceROI[serviceName].duration += booking.duration || 60;
            }
        });
        
        const roiData = Object.entries(serviceROI).map(([name, data]) => {
            const profit = data.revenue - data.cost;
            const roi = data.cost > 0 ? ((profit / data.cost) * 100) : 0;
            const avgDuration = data.duration / data.count;
            const revenuePerHour = (data.revenue / data.duration) * 60;
            
            return {
                name,
                revenue: data.revenue,
                cost: data.cost,
                profit,
                roi: roi.toFixed(1),
                count: data.count,
                revenuePerHour: revenuePerHour.toFixed(0)
            };
        }).sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
        
        const ctx = document.getElementById('serviceROIChart').getContext('2d');
        
        if (this.charts.serviceROI instanceof Chart) {
            this.charts.serviceROI.destroy();
            this.charts.serviceROI = null;
        }
        
        this.charts.serviceROI = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'บริการ',
                    data: roiData.map(d => ({
                        x: parseFloat(d.revenuePerHour),
                        y: parseFloat(d.roi),
                        service: d.name,
                        count: d.count
                    })),
                    backgroundColor: roiData.map((_, index) => {
                        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
                        return colors[index % colors.length];
                    }),
                    pointRadius: roiData.map(d => Math.max(5, Math.min(15, d.count))),
                    pointHoverRadius: roiData.map(d => Math.max(8, Math.min(20, d.count + 3)))
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'รายได้ต่อชั่วโมง (฿)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'ROI (%)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return context[0].raw.service;
                            },
                            label: function(context) {
                                const data = context.raw;
                                return [
                                    `รายได้/ชม: ${data.x} ฿`,
                                    `ROI: ${data.y}%`,
                                    `จำนวนครั้ง: ${data.count}`
                                ];
                            }
                        }
                    }
                }
            }
        });
        
        // Generate ROI table
        let tableHTML = `
            <table class="dt">
                <thead>
                    <tr>
                        <th>บริการ</th>
                        <th>ROI (%)</th>
                        <th>รายได้/ชม</th>
                        <th>กำไร</th>
                        <th>จำนวนครั้ง</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        roiData.slice(0, 10).forEach(service => {
            const roiClass = parseFloat(service.roi) >= 100 ? 'success' : 
                           parseFloat(service.roi) >= 50 ? 'warning' : 'danger';
            tableHTML += `
                <tr>
                    <td>${service.name}</td>
                    <td style="color: ${parseFloat(service.roi) >= 100 ? 'green' : parseFloat(service.roi) >= 50 ? 'orange' : 'red'}">
                        ${service.roi}%
                    </td>
                    <td>${service.revenuePerHour} ฿</td>
                    <td>${service.profit.toLocaleString()} ฿</td>
                    <td>${service.count}</td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        document.getElementById('roiTable').innerHTML = tableHTML;
    }

    generateDemandForecasting() {
        // Simple forecasting based on recent trends
        const dailyBookings = {};
        const dates = [];
        
        // Get last 30 days of data for forecasting
        const today = new Date();
        for (let i = 30; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = SabaiUtils.formatDateKey(date);
            dailyBookings[dateKey] = 0;
            dates.push(dateKey);
        }
        
        // Count bookings per day
        this.bookings.forEach(booking => {
            if (booking.startTime && booking.startTime.seconds) {
                const bookingDate = new Date(booking.startTime.seconds * 1000);
                const dateKey = SabaiUtils.formatDateKey(bookingDate);
                if (dailyBookings[dateKey] !== undefined) {
                    dailyBookings[dateKey]++;
                }
            }
        });
        
        // Calculate moving average for trend
        const values = Object.values(dailyBookings);
        const movingAverage = [];
        const window = 7; // 7-day moving average
        
        for (let i = window - 1; i < values.length; i++) {
            const sum = values.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
            movingAverage.push(sum / window);
        }
        
        // Simple linear projection for next 7 days
        const recentTrend = movingAverage.slice(-7);
        const avgGrowth = recentTrend.length > 1 ? 
            (recentTrend[recentTrend.length - 1] - recentTrend[0]) / (recentTrend.length - 1) : 0;
        
        const forecast = [];
        const lastValue = recentTrend[recentTrend.length - 1] || 0;
        
        for (let i = 1; i <= 7; i++) {
            forecast.push(Math.max(0, lastValue + (avgGrowth * i)));
        }
        
        const ctx = document.getElementById('demandForecastChart').getContext('2d');
        
        if (this.charts.demandForecast instanceof Chart) {
            this.charts.demandForecast.destroy();
            this.charts.demandForecast = null;
        }
        
        const labels = [...dates.slice(-14), ...Array.from({length: 7}, (_, i) => {
            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + i + 1);
            return SabaiUtils.formatDateKey(futureDate);
        })];
        
        this.charts.demandForecast = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(date => {
                    const d = new Date(date);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                }),
                datasets: [
                    {
                        label: 'ข้อมูลจริง',
                        data: [...Object.values(dailyBookings).slice(-14), ...Array(7).fill(null)],
                        borderColor: '#4ECDC4',
                        backgroundColor: 'rgba(78, 205, 196, 0.1)',
                        borderWidth: 3
                    },
                    {
                        label: 'คาดการณ์',
                        data: [...Array(14).fill(null), ...forecast],
                        borderColor: '#FF6B6B',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        borderDash: [5, 5],
                        borderWidth: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'จำนวนการจอง'
                        }
                    }
                }
            }
        });
        
        // Generate forecast summary
        const avgForecast = forecast.reduce((a, b) => a + b, 0) / forecast.length;
        const currentAvg = recentTrend.reduce((a, b) => a + b, 0) / recentTrend.length;
        const growthRate = currentAvg > 0 ? ((avgForecast - currentAvg) / currentAvg * 100) : 0;
        
        let summaryHTML = `
            <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #9c27b0;">
                <h4 style="margin-bottom: 10px; color: #7b1fa2;">🔮 การคาดการณ์ 7 วันข้างหน้า</h4>
                <p><strong>การจองเฉลี่ยต่อวัน:</strong> ${avgForecast.toFixed(1)} ครั้ง</p>
                <p><strong>แนวโน้มการเติบโต:</strong> ${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%</p>
                <p style="margin-top: 10px; font-size: 0.9em; color: #666;">
                    📊 การคาดการณ์อิงจากข้อมูล 7 วันล่าสุดและแนวโน้มการเติบโต
                </p>
            </div>
        `;
        
        document.getElementById('forecastSummary').innerHTML = summaryHTML;
    }

    generateSeasonalTrends() {
        // Analyze seasonal patterns by month
        const monthlyData = {};
        const monthNames = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];
        
        // Initialize months
        monthNames.forEach((month, index) => {
            monthlyData[index] = {
                bookings: 0,
                revenue: 0,
                avgTransaction: 0
            };
        });
        
        this.bookings.forEach(booking => {
            if (booking.startTime && booking.startTime.seconds) {
                const bookingDate = new Date(booking.startTime.seconds * 1000);
                const month = bookingDate.getMonth();
                
                const revenue = (booking.price || 0) * (1 - (booking.discount || 0) / 100);
                
                monthlyData[month].bookings += 1;
                monthlyData[month].revenue += revenue;
            }
        });
        
        // Calculate average transaction
        Object.keys(monthlyData).forEach(month => {
            const data = monthlyData[month];
            data.avgTransaction = data.bookings > 0 ? data.revenue / data.bookings : 0;
        });
        
        const ctx = document.getElementById('seasonalTrendsChart').getContext('2d');
        
        if (this.charts.seasonalTrends instanceof Chart) {
            this.charts.seasonalTrends.destroy();
            this.charts.seasonalTrends = null;
        }
        
        this.charts.seasonalTrends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthNames,
                datasets: [
                    {
                        label: 'จำนวนการจอง',
                        data: Object.values(monthlyData).map(d => d.bookings),
                        borderColor: '#4ECDC4',
                        backgroundColor: 'rgba(78, 205, 196, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4
                    },
                    {
                        label: 'รายได้ (พัน฿)',
                        data: Object.values(monthlyData).map(d => d.revenue / 1000),
                        borderColor: '#FF6B6B',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'จำนวนการจอง'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'รายได้ (พัน฿)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
        
        // Find peak and low seasons
        const sortedMonths = Object.entries(monthlyData)
            .map(([index, data]) => ({month: monthNames[index], ...data, index: parseInt(index)}))
            .sort((a, b) => b.bookings - a.bookings);
        
        const peakSeason = sortedMonths[0];
        const lowSeason = sortedMonths[sortedMonths.length - 1];
        
        let insightsHTML = `
            <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
                <h4 style="margin-bottom: 10px; color: #2e7d32;">🌟 ข้อมูลเชิงลึกตามฤดูกาล</h4>
        `;
        
        if (peakSeason.bookings > 0) {
            insightsHTML += `
                <p><strong>🔥 ช่วงที่คนมากที่สุด:</strong> ${peakSeason.month} (${peakSeason.bookings} การจอง)</p>
                <p><strong>📉 ช่วงที่คนน้อยที่สุด:</strong> ${lowSeason.month} (${lowSeason.bookings} การจอง)</p>
            `;
        } else {
            insightsHTML += '<p>📊 ต้องการข้อมูลเพิ่มเติมเพื่อวิเคราะห์แนวโน้มตามฤดูกาล</p>';
        }
        
        insightsHTML += '</div>';
        document.getElementById('seasonalInsights').innerHTML = insightsHTML;
    }

    generateGrowthProjections() {
        // Calculate growth metrics
        const weeklyData = {};
        
        // Group bookings by week
        this.bookings.forEach(booking => {
            if (booking.startTime && booking.startTime.seconds) {
                const bookingDate = new Date(booking.startTime.seconds * 1000);
                const weekStart = new Date(bookingDate);
                weekStart.setDate(bookingDate.getDate() - bookingDate.getDay());
                const weekKey = SabaiUtils.formatDateKey(weekStart);
                
                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = {
                        bookings: 0,
                        revenue: 0
                    };
                }
                
                const revenue = (booking.price || 0) * (1 - (booking.discount || 0) / 100);
                weeklyData[weekKey].bookings += 1;
                weeklyData[weekKey].revenue += revenue;
            }
        });
        
        const weeks = Object.keys(weeklyData).sort();
        const revenueData = weeks.map(week => weeklyData[week].revenue);
        const bookingData = weeks.map(week => weeklyData[week].bookings);
        
        // Calculate growth rate
        const recentWeeks = revenueData.slice(-4); // Last 4 weeks
        let growthRate = 0;
        
        if (recentWeeks.length >= 2) {
            const oldAvg = recentWeeks.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
            const newAvg = recentWeeks.slice(-2).reduce((a, b) => a + b, 0) / 2;
            growthRate = oldAvg > 0 ? ((newAvg - oldAvg) / oldAvg) * 100 : 0;
        }
        
        // Project future growth
        const lastRevenue = revenueData[revenueData.length - 1] || 0;
        const projectedRevenue = [];
        
        for (let i = 1; i <= 4; i++) {
            const projection = lastRevenue * Math.pow(1 + (growthRate / 100), i);
            projectedRevenue.push(Math.max(0, projection));
        }
        
        const ctx = document.getElementById('growthProjectionChart').getContext('2d');
        
        if (this.charts.growthProjection instanceof Chart) {
            this.charts.growthProjection.destroy();
            this.charts.growthProjection = null;
        }
        
        const allWeeks = [...weeks.slice(-8), 'สัปดาห์+1', 'สัปดาห์+2', 'สัปดาห์+3', 'สัปดาห์+4'];
        
        this.charts.growthProjection = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: allWeeks.map(week => {
                    if (week.includes('+')) return week;
                    const date = new Date(week);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                }),
                datasets: [
                    {
                        label: 'รายได้จริง',
                        data: [...revenueData.slice(-8), ...Array(4).fill(null)],
                        backgroundColor: '#4ECDC4',
                        borderColor: '#26A69A',
                        borderWidth: 1
                    },
                    {
                        label: 'รายได้คาดการณ์',
                        data: [...Array(8).fill(null), ...projectedRevenue],
                        backgroundColor: '#FFB74D',
                        borderColor: '#FF9800',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'รายได้ (฿)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + ' ฿';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' ฿';
                            }
                        }
                    }
                }
            }
        });
        
        // Generate growth metrics
        const currentMonthRevenue = recentWeeks.reduce((a, b) => a + b, 0);
        const projectedMonthRevenue = projectedRevenue.reduce((a, b) => a + b, 0);
        
        let metricsHTML = `
            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff9800;">
                <h4 style="margin-bottom: 10px; color: #e65100;">📈 เมตริกการเติบโต</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                    <div>
                        <p><strong>อัตราการเติบโต:</strong></p>
                        <p style="font-size: 1.2em; color: ${growthRate >= 0 ? 'green' : 'red'};">
                            ${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%
                        </p>
                    </div>
                    <div>
                        <p><strong>รายได้ปัจจุบัน (4 สัปดาห์):</strong></p>
                        <p style="font-size: 1.2em; color: #333;">
                            ${currentMonthRevenue.toLocaleString()} ฿
                        </p>
                    </div>
                    <div>
                        <p><strong>รายได้คาดการณ์ (4 สัปดาห์):</strong></p>
                        <p style="font-size: 1.2em; color: #ff9800;">
                            ${projectedMonthRevenue.toLocaleString()} ฿
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('growthMetrics').innerHTML = metricsHTML;
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