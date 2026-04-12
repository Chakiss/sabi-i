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
        try {
            // Load Chart.js and base data in parallel
            await Promise.all([
                this.loadChartJS(),
                this.loadBaseData()
            ]);

            this.setupEventListeners();
            await this.loadReport('today');

        } catch (error) {
            console.error('Error initializing reports:', error);
            this.showError('ไม่สามารถโหลดข้อมูลรายงานได้');
        }
    }

    async loadChartJS() {
        if (typeof Chart !== 'undefined') return;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Chart.js'));
            document.head.appendChild(script);
        });
    }

    async loadBaseData() {
        log('📂 Loading base data...');
        
        // Load therapists and services
        this.therapists = await this.dataService.getTherapists();
        this.services = await this.dataService.getServices();
        
        log('✅ Base data loaded:', {
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

        // Export raw data
        document.getElementById('exportRawBtn').addEventListener('click', () => {
            this.exportRawCSV();
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
        log('📊 Loading report for period:', period);
        
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
        
        log('📅 Date range set for period:', period);
        log('📅 Start date:', this.currentStartDate.toLocaleDateString('th-TH'));
        log('📅 End date:', this.currentEndDate.toLocaleDateString('th-TH'));
        log('📅 Date range details:', {
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
        log('🗑️ Destroying existing charts...');
        Object.keys(this.charts).forEach(chartName => {
            if (this.charts[chartName] instanceof Chart) {
                try {
                    this.charts[chartName].destroy();
                    log(`✅ Destroyed chart: ${chartName}`);
                } catch (error) {
                    console.warn(`⚠️ Error destroying chart ${chartName}:`, error);
                }
                this.charts[chartName] = null;
            }
        });
        this.charts = {};
    }

    async generateReport() {
        // Remove stale no-data banner
        const oldBanner = document.getElementById('noDataBanner');
        if (oldBanner) oldBanner.remove();

        this.showLoading(true);

        try {
            await this.loadBookingsForPeriod();
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
        // Single query for entire date range instead of one query per day
        this.bookings = await this.dataService.getBookingsByDateRange(
            this.currentStartDate,
            this.currentEndDate
        );
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
            dashContent.style.opacity = '0.4';
            dashContent.style.pointerEvents = 'none';
            loadingState.style.display = 'flex';
        } else {
            loadingState.style.display = 'none';
            dashContent.style.display = 'flex';
            // Trigger reflow then fade in
            requestAnimationFrame(() => {
                dashContent.style.opacity = '1';
                dashContent.style.pointerEvents = '';
            });

            if (this.bookings.length === 0) {
                this.showNoDataMessage();
            }
        }
    }

    showNoDataMessage() {
        // Show inline no-data message inside dashboard content
        const existing = document.getElementById('noDataBanner');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = 'noDataBanner';
        banner.style.cssText = `
            background: #f8f9fa;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 40px 20px;
            text-align: center;
            color: #64748b;
            font-size: 15px;
            line-height: 1.6;
        `;
        banner.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 12px;">📭</div>
            <div style="font-weight: 600; color: #334155; margin-bottom: 6px;">ไม่มีข้อมูลในช่วงเวลานี้</div>
            <div>ลองเลือกช่วงเวลาอื่น</div>
        `;

        const dashContent = document.getElementById('dashContent');
        if (dashContent) {
            dashContent.insertBefore(banner, dashContent.firstChild);
        }
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

    exportRawCSV() {
        if (this.bookings.length === 0) {
            alert('ไม่มีข้อมูลให้ Export');
            return;
        }

        const headers = ['วันที่', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'ระยะเวลา (นาที)', 'รหัสหมอนวด', 'หมอนวด', 'บริการ', 'ราคา (฿)', 'ส่วนลด (%)', 'ราคาสุทธิ (฿)', 'ค่ามือ (฿)', 'กำไร (฿)', 'การชำระเงิน', 'หมายเหตุ'];

        const rows = this.bookings.map(b => {
            const therapist = this.therapists.find(t => t.id === b.therapistId);
            const service = this.services.find(s => s.id === b.serviceId);

            const dateKey = b.dateKey || '';
            let startTimeStr = '';
            let endTimeStr = '';
            if (b.startTime && b.startTime.seconds) {
                const d = new Date(b.startTime.seconds * 1000);
                startTimeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
            }
            if (b.endTime && b.endTime.seconds) {
                const d = new Date(b.endTime.seconds * 1000);
                endTimeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
            }

            const price = b.price || 0;
            const discount = b.discount || 0;
            const finalPrice = price * (1 - discount / 100);
            const fee = b.therapistFee || 0;
            const profit = finalPrice - fee;

            return [
                dateKey,
                startTimeStr,
                endTimeStr,
                b.duration || '',
                b.therapistId || '',
                therapist ? therapist.name : '',
                service ? service.name : (b.serviceId || ''),
                price,
                discount,
                Math.round(finalPrice),
                fee,
                Math.round(profit),
                b.paymentMethod || '',
                (b.note || '').replace(/"/g, '""')
            ];
        });

        // Sort by date then start time
        rows.sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]));

        // Build CSV with BOM for Excel Thai support
        const csvContent = '\uFEFF' + [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `saba-i_bookings_${this.formatDateForInput(this.currentStartDate)}_${this.formatDateForInput(this.currentEndDate)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
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

