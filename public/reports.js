// Summary Reports Application
class SabaiReports {
    constructor() {
        this.dataService = new SabaiDataService();
        this.currentPeriod = 'today';
        this.currentStartDate = new Date();
        this.currentEndDate = new Date();
        this.bookings = [];
        this.previousBookings = [];
        this.previousStartDate = null;
        this.previousEndDate = null;
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
            this.generateRevenueTrend();
            this.generateBestWorstDay();
            this.generateRevenueForecast();
            this.generateDiscountImpact();
            this.generateDailyPnL();
            this.generatePaymentChannelReport();
            await this.generatePaymentChannelYTD();
            this.generateRevenueByTherapist();
            this.generateFeeByTherapist();
            this.generateBookingsByTherapist();
            this.generateTherapistProductivity();
            this.generatePopularServices();
            this.generateDurationMix();
            this.generatePeakHours();
            this.generateDayOfWeekAnalysis();
            this.generateWeekdayVsWeekend();
            this.generateLeadTime();
            this.generateTherapistServicesBreakdown();
            this.generateTherapistUtilization();
            this.generateCapacityUtilization();
            this.generateBookingHeatmap();
            this.generateServicesByTimeOfDay();

            // Show results
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ Error generating report:', error);
            this.showError('ไม่สามารถสร้างรายงานได้');
        }
    }

    async loadBookingsForPeriod() {
        // Compute previous period of equal length, ending one ms before currentStartDate
        const duration = this.currentEndDate.getTime() - this.currentStartDate.getTime();
        this.previousEndDate = new Date(this.currentStartDate.getTime() - 1);
        this.previousStartDate = new Date(this.previousEndDate.getTime() - duration);

        // Forecast base: last 28 days ending today (independent of selected period)
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const f28Start = new Date(todayEnd.getTime() - 27 * 24 * 60 * 60 * 1000);
        f28Start.setHours(0, 0, 0, 0);
        this.forecastBaseStart = f28Start;
        this.forecastBaseEnd = todayEnd;

        // Load all ranges in parallel
        const [current, previous, forecastBase] = await Promise.all([
            this.dataService.getBookingsByDateRange(this.currentStartDate, this.currentEndDate),
            this.dataService.getBookingsByDateRange(this.previousStartDate, this.previousEndDate),
            this.dataService.getBookingsByDateRange(f28Start, todayEnd)
        ]);
        this.bookings = current;
        this.previousBookings = previous;
        this.forecastBaseBookings = forecastBase;
    }

    // Aggregate metrics for an arbitrary list of bookings
    computeMetrics(bookings) {
        let revenue = 0;
        let fee = 0;
        bookings.forEach(b => {
            const price = b.price || 0;
            const discount = b.discount || 0;
            revenue += price * (1 - discount / 100);
            fee += b.therapistFee || 0;
        });
        const count = bookings.length;
        const profit = revenue - fee;
        const avg = count > 0 ? revenue / count : 0;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        return { revenue, fee, profit, count, avg, margin };
    }

    // Render a delta badge: percent change vs previous (or pp for margin)
    renderDelta(elementId, current, previous, opts) {
        opts = opts || {};
        const el = document.getElementById(elementId);
        if (!el) return;

        const isPP = !!opts.percentagePoints; // true for margin: show as pp diff
        const formatPrev = opts.formatPrev || (v => Math.round(v).toLocaleString() + ' ฿');

        // No comparison possible
        if (previous === 0 && current === 0) {
            el.className = 'kpi-delta flat';
            el.innerHTML = '— ไม่มีข้อมูลช่วงก่อน';
            return;
        }
        if (previous === 0) {
            el.className = 'kpi-delta up';
            el.innerHTML = '<span class="delta-arrow">▲</span> ใหม่';
            return;
        }

        let deltaText, cls;
        if (isPP) {
            const diff = current - previous;
            const sign = diff > 0 ? '+' : '';
            deltaText = `${sign}${diff.toFixed(1)} pp`;
            cls = diff > 0.1 ? 'up' : (diff < -0.1 ? 'down' : 'flat');
        } else {
            const pct = ((current - previous) / Math.abs(previous)) * 100;
            const sign = pct > 0 ? '+' : '';
            deltaText = `${sign}${pct.toFixed(1)}%`;
            cls = pct > 0.5 ? 'up' : (pct < -0.5 ? 'down' : 'flat');
        }

        const arrow = cls === 'up' ? '▲' : (cls === 'down' ? '▼' : '–');
        el.className = `kpi-delta ${cls}`;
        el.innerHTML = `<span class="delta-arrow">${arrow}</span> ${deltaText} <span class="delta-prev">vs ${formatPrev(previous)}</span>`;
    }

    generateSummaryCards() {
        const cur = this.computeMetrics(this.bookings);
        const prev = this.computeMetrics(this.previousBookings);

        // Render values
        document.getElementById('totalRevenue').textContent = `${Math.round(cur.revenue).toLocaleString()} ฿`;
        document.getElementById('totalTherapistFee').textContent = `${Math.round(cur.fee).toLocaleString()} ฿`;
        document.getElementById('netProfit').textContent = `${Math.round(cur.profit).toLocaleString()} ฿`;
        document.getElementById('totalBookings').textContent = cur.count.toLocaleString();
        document.getElementById('avgTransaction').textContent = `${Math.round(cur.avg).toLocaleString()} ฿`;
        document.getElementById('grossMargin').textContent = `${cur.margin.toFixed(1)}%`;

        // Render delta badges
        const baht = v => Math.round(v).toLocaleString() + ' ฿';
        const num  = v => Math.round(v).toLocaleString();
        const pct  = v => v.toFixed(1) + '%';

        this.renderDelta('totalRevenueDelta',       cur.revenue, prev.revenue, { formatPrev: baht });
        this.renderDelta('netProfitDelta',          cur.profit,  prev.profit,  { formatPrev: baht });
        this.renderDelta('totalTherapistFeeDelta',  cur.fee,     prev.fee,     { formatPrev: baht });
        this.renderDelta('totalBookingsDelta',      cur.count,   prev.count,   { formatPrev: num });
        this.renderDelta('avgTransactionDelta',     cur.avg,     prev.avg,     { formatPrev: baht });
        this.renderDelta('grossMarginDelta',        cur.margin,  prev.margin,  { percentagePoints: true, formatPrev: pct });
    }

    generateRevenueTrend() {
        const ctx = document.getElementById('revenueTrendChart').getContext('2d');
        const titleEl = document.getElementById('revenueTrendTitle');

        // Decide bucket: by hour if single-day; by day otherwise
        const startMs = this.currentStartDate.getTime();
        const endMs = this.currentEndDate.getTime();
        const dayMs = 24 * 60 * 60 * 1000;
        const totalDays = Math.ceil((endMs - startMs) / dayMs);
        const groupByHour = totalDays <= 1;

        // Build bucket map
        const buckets = new Map(); // key -> { label, revenue, profit }

        if (groupByHour) {
            titleEl.textContent = 'รายได้และกำไรตามชั่วโมง (วันเดียว)';
            // Pre-fill all hours within shop hours
            const startHour = (typeof CONFIG !== 'undefined' && CONFIG.SHOP_START_HOUR) || 10;
            const endHour = (typeof CONFIG !== 'undefined' && CONFIG.SHOP_END_HOUR) || 22;
            for (let h = startHour; h < endHour; h++) {
                const key = String(h).padStart(2, '0');
                buckets.set(key, { label: `${key}:00`, revenue: 0, profit: 0 });
            }
        } else {
            titleEl.textContent = 'รายได้และกำไรรายวัน';
            // Pre-fill all days inclusive
            const start = new Date(this.currentStartDate.getFullYear(), this.currentStartDate.getMonth(), this.currentStartDate.getDate());
            const end = new Date(this.currentEndDate.getFullYear(), this.currentEndDate.getMonth(), this.currentEndDate.getDate());
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const key = SabaiUtils.formatDateKey(d);
                const label = `${d.getDate()}/${d.getMonth() + 1}`;
                buckets.set(key, { label, revenue: 0, profit: 0 });
            }
        }

        // Aggregate bookings into buckets
        this.bookings.forEach(b => {
            const price = b.price || 0;
            const discount = b.discount || 0;
            const finalPrice = price * (1 - discount / 100);
            const fee = b.therapistFee || 0;
            const profit = finalPrice - fee;

            let key;
            if (groupByHour) {
                if (!b.startTime || !b.startTime.seconds) return;
                const d = new Date(b.startTime.seconds * 1000);
                key = String(d.getHours()).padStart(2, '0');
            } else {
                key = b.dateKey;
            }

            const bucket = buckets.get(key);
            if (!bucket) return; // outside expected range
            bucket.revenue += finalPrice;
            bucket.profit += profit;
        });

        const labels = [];
        const revenueData = [];
        const profitData = [];
        buckets.forEach(v => {
            labels.push(v.label);
            revenueData.push(Math.round(v.revenue));
            profitData.push(Math.round(v.profit));
        });

        if (this.charts.revenueTrend instanceof Chart) {
            this.charts.revenueTrend.destroy();
            this.charts.revenueTrend = null;
        }

        this.charts.revenueTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'รายได้สุทธิ',
                        data: revenueData,
                        borderColor: '#6E5B3F',
                        backgroundColor: 'rgba(160, 133, 98, 0.18)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'กำไรสุทธิ',
                        data: profitData,
                        borderColor: '#6B7A5A',
                        backgroundColor: 'rgba(107, 122, 90, 0.12)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 16, usePointStyle: true, font: { size: 12, weight: '500' } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + ' ฿';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) { return value.toLocaleString() + ' ฿'; }
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
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

    generateTherapistProductivity() {
        const stats = {}; // therapistId -> aggregate

        this.bookings.forEach(b => {
            const tid = b.therapistId;
            if (!tid) return;

            const price = b.price || 0;
            const discount = b.discount || 0;
            const finalPrice = price * (1 - discount / 100);
            const fee = b.therapistFee || 0;
            const minutes = b.duration || 0;

            if (!stats[tid]) {
                stats[tid] = { id: tid, sessions: 0, minutes: 0, revenue: 0, fee: 0 };
            }
            stats[tid].sessions += 1;
            stats[tid].minutes += minutes;
            stats[tid].revenue += finalPrice;
            stats[tid].fee += fee;
        });

        // Compute derived metrics + therapist name
        const rows = Object.values(stats).map(s => {
            const therapist = this.therapists.find(t => t.id === s.id);
            const hours = s.minutes / 60;
            return {
                name: therapist ? therapist.name : 'ไม่ทราบ',
                sessions: s.sessions,
                hours,
                revenue: s.revenue,
                fee: s.fee,
                revPerHour: hours > 0 ? s.revenue / hours : 0,
                feePerSession: s.sessions > 0 ? s.fee / s.sessions : 0
            };
        });

        // Sort by revenue per hour (productivity) desc
        rows.sort((a, b) => b.revPerHour - a.revPerHour);

        const container = document.getElementById('therapistProductivityTable');
        if (rows.length === 0) {
            container.innerHTML = '<div class="no-data">ไม่มีข้อมูลการจอง</div>';
            return;
        }

        const maxRevPerHour = Math.max(...rows.map(r => r.revPerHour));

        let html = `
            <table class="dt">
                <thead>
                    <tr>
                        <th style="width:40px;">#</th>
                        <th>หมอนวด</th>
                        <th style="text-align:right;">Sessions</th>
                        <th style="text-align:right;">ชม.รวม</th>
                        <th style="text-align:right;">รายได้/ชม.</th>
                        <th style="text-align:right;">ค่ามือ/Session</th>
                    </tr>
                </thead>
                <tbody>
        `;

        rows.forEach((r, i) => {
            const barPct = maxRevPerHour > 0 ? (r.revPerHour / maxRevPerHour) * 100 : 0;
            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${r.name}</td>
                    <td style="text-align:right;">${r.sessions.toLocaleString()}</td>
                    <td style="text-align:right;">${r.hours.toFixed(1)}</td>
                    <td style="text-align:right;">
                        <div style="display:flex; align-items:center; gap:8px; justify-content:flex-end;">
                            <span>${Math.round(r.revPerHour).toLocaleString()} ฿</span>
                            <div class="pbar-wrap" style="width:60px; flex-shrink:0;">
                                <div class="pbar-fill" style="width:${barPct}%"></div>
                            </div>
                        </div>
                    </td>
                    <td style="text-align:right;">${Math.round(r.feePerSession).toLocaleString()} ฿</td>
                </tr>
            `;
        });

        // Totals row
        const totalSessions = rows.reduce((a, r) => a + r.sessions, 0);
        const totalHours = rows.reduce((a, r) => a + r.hours, 0);
        const totalRevenue = rows.reduce((a, r) => a + r.revenue, 0);
        const totalFee = rows.reduce((a, r) => a + r.fee, 0);
        const overallRevPerHour = totalHours > 0 ? totalRevenue / totalHours : 0;
        const overallFeePerSession = totalSessions > 0 ? totalFee / totalSessions : 0;
        html += `
                    <tr class="total-row">
                        <td></td>
                        <td>รวม / เฉลี่ย</td>
                        <td style="text-align:right;">${totalSessions.toLocaleString()}</td>
                        <td style="text-align:right;">${totalHours.toFixed(1)}</td>
                        <td style="text-align:right;">${Math.round(overallRevPerHour).toLocaleString()} ฿</td>
                        <td style="text-align:right;">${Math.round(overallFeePerSession).toLocaleString()} ฿</td>
                    </tr>
                </tbody>
            </table>
        `;
        container.innerHTML = html;
    }

    generatePopularServices() {
        const serviceBookings = {};
        let totalRevenue = 0;

        this.bookings.forEach(booking => {
            if (!booking.serviceId) return;
            const service = this.services.find(s => s.id === booking.serviceId);
            const serviceName = service ? service.name : 'ไม่ทราบ';

            if (!serviceBookings[serviceName]) {
                serviceBookings[serviceName] = { count: 0, revenue: 0 };
            }

            serviceBookings[serviceName].count += 1;
            const price = booking.price || 0;
            const discount = booking.discount || 0;
            const finalPrice = price * (1 - discount / 100);
            serviceBookings[serviceName].revenue += finalPrice;
            totalRevenue += finalPrice;
        });

        const sortedServices = Object.entries(serviceBookings)
            .sort(([, a], [, b]) => b.revenue - a.revenue);

        const container = document.getElementById('popularServicesTable');
        if (sortedServices.length === 0) {
            container.innerHTML = '<div class="no-data">ไม่มีข้อมูลบริการ</div>';
            return;
        }

        const maxRevenue = sortedServices[0][1].revenue;
        let html = `
            <table class="dt">
                <thead>
                    <tr>
                        <th style="width:32px;">#</th>
                        <th>บริการ</th>
                        <th style="text-align:right;">ครั้ง</th>
                        <th style="text-align:right;">รายได้</th>
                        <th style="text-align:right;">% รายได้</th>
                    </tr>
                </thead>
                <tbody>
        `;
        sortedServices.slice(0, 10).forEach(([name, data], i) => {
            const pct = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0;
            const barPct = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;
            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${name}</td>
                    <td style="text-align:right;">${data.count}</td>
                    <td style="text-align:right;">
                        <div style="display:flex; align-items:center; gap:8px; justify-content:flex-end;">
                            <span>${Math.round(data.revenue).toLocaleString()} ฿</span>
                            <div class="pbar-wrap" style="width:50px; flex-shrink:0;">
                                <div class="pbar-fill" style="width:${barPct}%"></div>
                            </div>
                        </div>
                    </td>
                    <td style="text-align:right;">${pct.toFixed(1)}%</td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    generateDurationMix() {
        const bucket = {}; // duration (min) -> count
        this.bookings.forEach(b => {
            const d = b.duration || 0;
            if (!d) return;
            bucket[d] = (bucket[d] || 0) + 1;
        });

        const ctx = document.getElementById('durationMixChart').getContext('2d');
        if (this.charts.durationMix instanceof Chart) {
            this.charts.durationMix.destroy();
            this.charts.durationMix = null;
        }

        const sortedDurations = Object.keys(bucket).map(Number).sort((a, b) => a - b);
        if (sortedDurations.length === 0) {
            // empty placeholder
            this.charts.durationMix = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: ['ไม่มีข้อมูล'], datasets: [{ data: [1], backgroundColor: ['#EDE5D6'] }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
            });
            return;
        }

        const labels = sortedDurations.map(d => `${d} นาที`);
        const data = sortedDurations.map(d => bucket[d]);
        const total = data.reduce((a, b) => a + b, 0);

        const palette = ['#A08562', '#B89C70', '#D4B78E', '#6E5B3F', '#8A7250', '#C4A57B'];

        this.charts.durationMix = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: labels.map((_, i) => palette[i % palette.length]),
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
                        labels: { padding: 12, usePointStyle: true, font: { size: 11, weight: '500' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                const v = ctx.parsed;
                                const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
                                return `${ctx.label}: ${v} ครั้ง (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    generateBestWorstDay() {
        const container = document.getElementById('bestWorstDay');
        // Need at least 2 days
        const dayMs = 24 * 60 * 60 * 1000;
        const days = Math.round((this.currentEndDate - this.currentStartDate) / dayMs);
        if (days < 2) {
            container.style.display = 'none';
            return;
        }

        // Aggregate by dateKey
        const byDate = {};
        this.bookings.forEach(b => {
            const key = b.dateKey;
            if (!key) return;
            if (!byDate[key]) byDate[key] = { count: 0, revenue: 0 };
            const price = b.price || 0;
            const discount = b.discount || 0;
            byDate[key].revenue += price * (1 - discount / 100);
            byDate[key].count += 1;
        });

        const entries = Object.entries(byDate);
        if (entries.length < 2) {
            container.style.display = 'none';
            return;
        }

        entries.sort(([, a], [, b]) => b.revenue - a.revenue);
        const best = entries[0];
        const worst = entries[entries.length - 1];

        const formatDate = (key) => {
            const [y, m, d] = key.split('-');
            const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
            return dt.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
        };

        container.style.display = 'grid';
        container.innerHTML = `
            <div class="insight-card best">
                <div class="insight-label">🏆 วันที่ขายดีที่สุด</div>
                <div class="insight-date">${formatDate(best[0])}</div>
                <div class="insight-meta">${Math.round(best[1].revenue).toLocaleString()} ฿ · ${best[1].count} จอง</div>
            </div>
            <div class="insight-card worst">
                <div class="insight-label">📉 วันที่ขายน้อยที่สุด</div>
                <div class="insight-date">${formatDate(worst[0])}</div>
                <div class="insight-meta">${Math.round(worst[1].revenue).toLocaleString()} ฿ · ${worst[1].count} จอง</div>
            </div>
        `;
    }

    generateWeekdayVsWeekend() {
        // Aggregate per dateKey, classify each date as weekday or weekend
        const byDate = {}; // key -> { revenue, count, isWeekend }
        this.bookings.forEach(b => {
            if (!b.dateKey) return;
            if (!byDate[b.dateKey]) {
                const [y, m, d] = b.dateKey.split('-');
                const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
                const dow = dt.getDay(); // 0=Sun,6=Sat
                byDate[b.dateKey] = { revenue: 0, count: 0, isWeekend: dow === 0 || dow === 6 };
            }
            const price = b.price || 0;
            const discount = b.discount || 0;
            byDate[b.dateKey].revenue += price * (1 - discount / 100);
            byDate[b.dateKey].count += 1;
        });

        let wdRevenue = 0, wdCount = 0, wdDays = 0;
        let weRevenue = 0, weCount = 0, weDays = 0;
        Object.values(byDate).forEach(d => {
            if (d.isWeekend) {
                weRevenue += d.revenue;
                weCount += d.count;
                weDays += 1;
            } else {
                wdRevenue += d.revenue;
                wdCount += d.count;
                wdDays += 1;
            }
        });

        const wdAvgRev = wdDays > 0 ? wdRevenue / wdDays : 0;
        const weAvgRev = weDays > 0 ? weRevenue / weDays : 0;
        const wdAvgCnt = wdDays > 0 ? wdCount / wdDays : 0;
        const weAvgCnt = weDays > 0 ? weCount / weDays : 0;

        let diffText = '';
        if (wdAvgRev > 0 && weAvgRev > 0) {
            const pct = ((weAvgRev - wdAvgRev) / wdAvgRev) * 100;
            const sign = pct > 0 ? '+' : '';
            diffText = `<div style="text-align:center; margin-top:12px; font-size:12px; color:var(--muted);">เสาร์-อาทิตย์ทำเงิน <strong style="color:${pct >= 0 ? 'var(--green)' : 'var(--red)'};">${sign}${pct.toFixed(1)}%</strong> เทียบกับวันธรรมดา</div>`;
        }

        document.getElementById('weekdayVsWeekend').innerHTML = `
            <div class="wdwe-row">
                <div class="wdwe-card">
                    <div class="wdwe-label">วันธรรมดา (จ–ศ)</div>
                    <div class="wdwe-value">${Math.round(wdAvgRev).toLocaleString()} ฿</div>
                    <div class="wdwe-meta">เฉลี่ย/วัน · ${wdAvgCnt.toFixed(1)} จอง/วัน · ${wdDays} วัน</div>
                </div>
                <div class="wdwe-card">
                    <div class="wdwe-label">เสาร์-อาทิตย์</div>
                    <div class="wdwe-value">${Math.round(weAvgRev).toLocaleString()} ฿</div>
                    <div class="wdwe-meta">เฉลี่ย/วัน · ${weAvgCnt.toFixed(1)} จอง/วัน · ${weDays} วัน</div>
                </div>
            </div>
            ${diffText}
        `;
    }

    generateDailyPnL() {
        // Aggregate per dateKey
        const byDate = {};
        this.bookings.forEach(b => {
            if (!b.dateKey) return;
            if (!byDate[b.dateKey]) {
                byDate[b.dateKey] = { count: 0, gross: 0, discount: 0, revenue: 0, fee: 0 };
            }
            const price = b.price || 0;
            const discountPct = b.discount || 0;
            const discountBaht = price * (discountPct / 100);
            const finalPrice = price - discountBaht;
            const fee = b.therapistFee || 0;

            byDate[b.dateKey].count += 1;
            byDate[b.dateKey].gross += price;
            byDate[b.dateKey].discount += discountBaht;
            byDate[b.dateKey].revenue += finalPrice;
            byDate[b.dateKey].fee += fee;
        });

        const rows = Object.entries(byDate)
            .map(([dateKey, v]) => ({ dateKey, ...v, profit: v.revenue - v.fee, margin: v.revenue > 0 ? (v.revenue - v.fee) / v.revenue * 100 : 0 }))
            .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

        const container = document.getElementById('dailyPnLTable');
        if (rows.length === 0) {
            container.innerHTML = '<div class="no-data">ไม่มีข้อมูล</div>';
            return;
        }

        let html = `
            <div style="overflow-x:auto;">
            <table class="dt">
                <thead>
                    <tr>
                        <th>วันที่</th>
                        <th style="text-align:right;">จอง</th>
                        <th style="text-align:right;">Gross</th>
                        <th style="text-align:right;">ส่วนลด</th>
                        <th style="text-align:right;">รายได้</th>
                        <th style="text-align:right;">ค่ามือ</th>
                        <th style="text-align:right;">กำไร</th>
                        <th style="text-align:right;">Margin</th>
                    </tr>
                </thead>
                <tbody>
        `;
        const formatDate = (key) => {
            const [y, m, d] = key.split('-');
            const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
            return dt.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
        };
        rows.forEach(r => {
            html += `
                <tr>
                    <td>${formatDate(r.dateKey)}</td>
                    <td style="text-align:right;">${r.count}</td>
                    <td style="text-align:right;">${Math.round(r.gross).toLocaleString()}</td>
                    <td style="text-align:right; color:var(--orange);">${r.discount > 0 ? '-' + Math.round(r.discount).toLocaleString() : '0'}</td>
                    <td style="text-align:right;">${Math.round(r.revenue).toLocaleString()}</td>
                    <td style="text-align:right;">${Math.round(r.fee).toLocaleString()}</td>
                    <td style="text-align:right; font-weight:600;">${Math.round(r.profit).toLocaleString()}</td>
                    <td style="text-align:right;">${r.margin.toFixed(1)}%</td>
                </tr>
            `;
        });
        // Totals
        const totals = rows.reduce((a, r) => ({
            count: a.count + r.count,
            gross: a.gross + r.gross,
            discount: a.discount + r.discount,
            revenue: a.revenue + r.revenue,
            fee: a.fee + r.fee
        }), { count: 0, gross: 0, discount: 0, revenue: 0, fee: 0 });
        const totalProfit = totals.revenue - totals.fee;
        const totalMargin = totals.revenue > 0 ? (totalProfit / totals.revenue) * 100 : 0;
        html += `
                    <tr class="total-row">
                        <td>รวม</td>
                        <td style="text-align:right;">${totals.count}</td>
                        <td style="text-align:right;">${Math.round(totals.gross).toLocaleString()}</td>
                        <td style="text-align:right; color:var(--orange);">${totals.discount > 0 ? '-' + Math.round(totals.discount).toLocaleString() : '0'}</td>
                        <td style="text-align:right;">${Math.round(totals.revenue).toLocaleString()}</td>
                        <td style="text-align:right;">${Math.round(totals.fee).toLocaleString()}</td>
                        <td style="text-align:right;">${Math.round(totalProfit).toLocaleString()}</td>
                        <td style="text-align:right;">${totalMargin.toFixed(1)}%</td>
                    </tr>
                </tbody>
            </table>
            </div>
        `;
        container.innerHTML = html;
    }

    generateDiscountImpact() {
        let totalGross = 0;
        let totalDiscount = 0;
        let bookingsWithDiscount = 0;
        let sumDiscountPct = 0; // sum of % over discounted bookings (for avg %)

        this.bookings.forEach(b => {
            const price = b.price || 0;
            const discountPct = b.discount || 0;
            totalGross += price;
            if (discountPct > 0) {
                bookingsWithDiscount += 1;
                totalDiscount += price * (discountPct / 100);
                sumDiscountPct += discountPct;
            }
        });

        const totalBookings = this.bookings.length;
        const usagePct = totalBookings > 0 ? (bookingsWithDiscount / totalBookings) * 100 : 0;
        const avgDiscountPct = bookingsWithDiscount > 0 ? sumDiscountPct / bookingsWithDiscount : 0;
        const avgDiscountBaht = bookingsWithDiscount > 0 ? totalDiscount / bookingsWithDiscount : 0;
        const revenueLossPct = totalGross > 0 ? (totalDiscount / totalGross) * 100 : 0;

        document.getElementById('discountImpactStats').innerHTML = `
            <div class="stat-grid">
                <div class="stat-tile">
                    <div class="stat-label">ส่วนลดรวม</div>
                    <div class="stat-value" style="color:var(--orange);">${Math.round(totalDiscount).toLocaleString()} ฿</div>
                    <div class="stat-meta">${revenueLossPct.toFixed(1)}% ของยอดเต็ม</div>
                </div>
                <div class="stat-tile">
                    <div class="stat-label">บิลที่ใช้ส่วนลด</div>
                    <div class="stat-value">${bookingsWithDiscount} <span style="font-size:13px; color:var(--muted); font-weight:400;">/ ${totalBookings}</span></div>
                    <div class="stat-meta">${usagePct.toFixed(1)}% ของบิลทั้งหมด</div>
                </div>
                <div class="stat-tile">
                    <div class="stat-label">ส่วนลดเฉลี่ย/บิล (%)</div>
                    <div class="stat-value">${avgDiscountPct.toFixed(1)}%</div>
                    <div class="stat-meta">เฉพาะบิลที่ใช้ส่วนลด</div>
                </div>
                <div class="stat-tile">
                    <div class="stat-label">ส่วนลดเฉลี่ย/บิล (฿)</div>
                    <div class="stat-value">${Math.round(avgDiscountBaht).toLocaleString()} ฿</div>
                    <div class="stat-meta">เฉพาะบิลที่ใช้ส่วนลด</div>
                </div>
            </div>
        `;
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

    generatePaymentChannelReport() {
        const channelLabels = {
            'kbank':    '💳 กสิกร',
            'scb':      '💳 ไทยพาณิชย์',
            'transfer': '💳 โอน',
            'cash':     '💵 สด',
            'unknown':  '❓ ไม่ระบุ'
        };
        const channelOrder = ['cash', 'kbank', 'scb', 'transfer', 'unknown'];

        const stats = {};
        channelOrder.forEach(k => { stats[k] = { count: 0, revenue: 0 }; });

        this.bookings.forEach(booking => {
            const key = booking.paymentMethod && channelLabels[booking.paymentMethod]
                ? booking.paymentMethod
                : 'unknown';
            const price = booking.price || 0;
            const discount = booking.discount || 0;
            const finalPrice = price * (1 - discount / 100);
            stats[key].count += 1;
            stats[key].revenue += finalPrice;
        });

        const activeChannels = channelOrder.filter(k => stats[k].count > 0);
        const totalRevenue = activeChannels.reduce((s, k) => s + stats[k].revenue, 0);
        const totalCount   = activeChannels.reduce((s, k) => s + stats[k].count,   0);

        let tableHTML = `
            <table class="dt">
                <thead>
                    <tr>
                        <th>ช่องทาง</th>
                        <th>จำนวน</th>
                        <th>ยอดขาย (฿)</th>
                        <th>%</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (activeChannels.length === 0) {
            document.getElementById('paymentChannelTable').innerHTML =
                '<div class="no-data">ไม่มีข้อมูลการชำระเงิน</div>';
            return;
        }

        activeChannels
            .slice()
            .sort((a, b) => stats[b].revenue - stats[a].revenue)
            .forEach(k => {
                const row = stats[k];
                const pct = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0;
                tableHTML += `
                    <tr>
                        <td>${channelLabels[k]}</td>
                        <td>${row.count}</td>
                        <td>${Math.round(row.revenue).toLocaleString()}</td>
                        <td>
                            <div class="pbar-wrap">
                                <div class="pbar-fill" style="width: ${pct}%"></div>
                            </div>
                            ${pct.toFixed(1)}%
                        </td>
                    </tr>
                `;
            });

        tableHTML += `
                <tr class="total-row">
                    <td>รวมทั้งหมด</td>
                    <td>${totalCount}</td>
                    <td>${Math.round(totalRevenue).toLocaleString()}</td>
                    <td>100%</td>
                </tr>
            </tbody></table>
        `;

        document.getElementById('paymentChannelTable').innerHTML = tableHTML;
    }

    async generatePaymentChannelYTD() {
        const channelLabels = {
            'kbank':    '💳 กสิกร',
            'scb':      '💳 ไทยพาณิชย์',
            'transfer': '💳 โอน',
            'cash':     '💵 สด',
            'unknown':  '❓ ไม่ระบุ'
        };
        const channelOrder = ['cash', 'kbank', 'scb', 'transfer', 'unknown'];

        const now = new Date();
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

        const titleEl = document.getElementById('paymentChannelYTDTitle');
        if (titleEl) {
            titleEl.textContent = `ยอดสะสมรายช่องทาง (YTD ${now.getFullYear()} • ${this.formatDisplayDate(yearStart)} - ${this.formatDisplayDate(now)})`;
        }

        let ytdBookings = [];
        try {
            ytdBookings = await this.dataService.getBookingsByDateRange(yearStart, yearEnd);
        } catch (err) {
            console.error('Failed to load YTD bookings:', err);
            document.getElementById('paymentChannelYTDTable').innerHTML =
                '<div class="no-data">โหลดข้อมูล YTD ไม่สำเร็จ</div>';
            return;
        }

        const stats = {};
        channelOrder.forEach(k => { stats[k] = { count: 0, revenue: 0 }; });

        ytdBookings.forEach(booking => {
            const key = booking.paymentMethod && channelLabels[booking.paymentMethod]
                ? booking.paymentMethod
                : 'unknown';
            const price = booking.price || 0;
            const discount = booking.discount || 0;
            const finalPrice = price * (1 - discount / 100);
            stats[key].count += 1;
            stats[key].revenue += finalPrice;
        });

        const activeChannels = channelOrder.filter(k => stats[k].count > 0);
        const totalRevenue = activeChannels.reduce((s, k) => s + stats[k].revenue, 0);
        const totalCount   = activeChannels.reduce((s, k) => s + stats[k].count,   0);

        if (activeChannels.length === 0) {
            document.getElementById('paymentChannelYTDTable').innerHTML =
                '<div class="no-data">ไม่มีข้อมูลการชำระเงินในปีนี้</div>';
            return;
        }

        let tableHTML = `
            <table class="dt">
                <thead>
                    <tr>
                        <th>ช่องทาง</th>
                        <th>จำนวนรายการ</th>
                        <th>ยอดรวม (฿)</th>
                        <th>%</th>
                    </tr>
                </thead>
                <tbody>
        `;

        activeChannels
            .slice()
            .sort((a, b) => stats[b].revenue - stats[a].revenue)
            .forEach(k => {
                const row = stats[k];
                const pct = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0;
                tableHTML += `
                    <tr>
                        <td>${channelLabels[k]}</td>
                        <td>${row.count.toLocaleString()}</td>
                        <td>${Math.round(row.revenue).toLocaleString()}</td>
                        <td>
                            <div class="pbar-wrap">
                                <div class="pbar-fill" style="width: ${pct}%"></div>
                            </div>
                            ${pct.toFixed(1)}%
                        </td>
                    </tr>
                `;
            });

        tableHTML += `
                <tr class="total-row">
                    <td>รวมทั้งปี</td>
                    <td>${totalCount.toLocaleString()}</td>
                    <td>${Math.round(totalRevenue).toLocaleString()}</td>
                    <td>100%</td>
                </tr>
            </tbody></table>
        `;

        document.getElementById('paymentChannelYTDTable').innerHTML = tableHTML;
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

    // ─── Phase 3: Capacity, heatmap, time-of-day services ───
    generateCapacityUtilization() {
        const startHour = (typeof CONFIG !== 'undefined' && CONFIG.SHOP_START_HOUR) || 10;
        const endHour = (typeof CONFIG !== 'undefined' && CONFIG.SHOP_END_HOUR) || 22;
        const shopHoursPerDay = endHour - startHour;
        const numTherapists = this.therapists.length;

        // Days in period (inclusive, at least 1)
        const dayMs = 24 * 60 * 60 * 1000;
        const days = Math.max(1, Math.round((this.currentEndDate - this.currentStartDate) / dayMs));

        const availableHours = numTherapists * shopHoursPerDay * days;
        const usedHours = this.bookings.reduce((sum, b) => sum + (b.duration || 0) / 60, 0);
        const utilPct = availableHours > 0 ? (usedHours / availableHours) * 100 : 0;

        const container = document.getElementById('capacityUtilSummary');
        if (numTherapists === 0) {
            container.innerHTML = '<div class="no-data">ไม่มีข้อมูลหมอนวด</div>';
            return;
        }

        container.innerHTML = `
            <div class="cap-stat">
                <div class="cap-pct">${utilPct.toFixed(1)}%</div>
                <div class="cap-detail">
                    ใช้ไป <strong>${usedHours.toFixed(1)}</strong> ชม. จากทั้งหมด <strong>${availableHours.toLocaleString()}</strong> ชม.<br>
                    (${numTherapists} หมอ × ${shopHoursPerDay} ชม./วัน × ${days} วัน)
                </div>
            </div>
            <div class="cap-bar">
                <div class="cap-bar-fill" style="width:${Math.min(utilPct, 100)}%"></div>
            </div>
        `;
    }

    generateBookingHeatmap() {
        const startHour = (typeof CONFIG !== 'undefined' && CONFIG.SHOP_START_HOUR) || 10;
        const endHour = (typeof CONFIG !== 'undefined' && CONFIG.SHOP_END_HOUR) || 22;
        const hours = [];
        for (let h = startHour; h < endHour; h++) hours.push(h);

        const dowLabels = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']; // Mon..Sun

        // grid[dow][hour] = count
        const grid = Array.from({ length: 7 }, () => Array(hours.length).fill(0));

        this.bookings.forEach(b => {
            if (!b.startTime || !b.startTime.seconds) return;
            const d = new Date(b.startTime.seconds * 1000);
            const jsDow = d.getDay(); // 0=Sun
            const dow = jsDow === 0 ? 6 : jsDow - 1; // 0=Mon..6=Sun
            const hourIdx = hours.indexOf(d.getHours());
            if (hourIdx < 0) return;
            grid[dow][hourIdx] += 1;
        });

        let max = 0;
        grid.forEach(row => row.forEach(v => { if (v > max) max = v; }));

        // Color scale (5 steps) — sand/cream gradient
        const scale = ['#F4EDE2', '#E5D2AF', '#D4B78E', '#B89C70', '#A08562'];
        const colorFor = (v) => {
            if (v === 0 || max === 0) return scale[0];
            const t = v / max;
            const idx = Math.min(scale.length - 1, Math.floor(t * scale.length));
            return scale[idx];
        };

        const heatmap = document.getElementById('bookingHeatmap');
        // 1 corner + N hour cols
        heatmap.className = 'heatmap';
        heatmap.style.gridTemplateColumns = `36px repeat(${hours.length}, minmax(32px, 1fr))`;

        let html = '<div class="hm-corner"></div>';
        hours.forEach(h => {
            html += `<div class="hm-col-label">${String(h).padStart(2, '0')}</div>`;
        });
        for (let r = 0; r < 7; r++) {
            html += `<div class="hm-row-label">${dowLabels[r]}</div>`;
            for (let c = 0; c < hours.length; c++) {
                const v = grid[r][c];
                const cls = v === 0 ? 'hm-cell empty' : 'hm-cell';
                const title = `${dowLabels[r]} ${String(hours[c]).padStart(2, '0')}:00 — ${v} ${v === 1 ? 'จอง' : 'จอง'}`;
                html += `<div class="${cls}" style="background:${colorFor(v)}" title="${title}">${v || ''}</div>`;
            }
        }
        heatmap.innerHTML = html;

        // Legend swatches
        const legend = document.getElementById('heatmapLegendScale');
        legend.innerHTML = scale.map(c => `<span style="background:${c}"></span>`).join('');
    }

    generateServicesByTimeOfDay() {
        const buckets = [
            { key: 'morning',   label: 'เช้า',  range: 'เช้า (10–13)',  start: 10, end: 13, count: 0, services: {} },
            { key: 'afternoon', label: 'บ่าย',  range: 'บ่าย (13–17)',  start: 13, end: 17, count: 0, services: {} },
            { key: 'evening',   label: 'เย็น',  range: 'เย็น (17–22)',  start: 17, end: 22, count: 0, services: {} }
        ];

        this.bookings.forEach(b => {
            if (!b.startTime || !b.startTime.seconds) return;
            const hr = new Date(b.startTime.seconds * 1000).getHours();
            const bucket = buckets.find(bk => hr >= bk.start && hr < bk.end);
            if (!bucket) return;
            bucket.count += 1;

            const service = this.services.find(s => s.id === b.serviceId);
            const name = service ? service.name : (b.serviceId || 'ไม่ทราบ');
            bucket.services[name] = (bucket.services[name] || 0) + 1;
        });

        const container = document.getElementById('servicesByTimeOfDay');
        const totalBookings = this.bookings.length;
        if (totalBookings === 0) {
            container.innerHTML = '<div class="no-data">ไม่มีข้อมูลการจอง</div>';
            return;
        }

        let html = '<div class="tod-grid">';
        buckets.forEach(b => {
            const top = Object.entries(b.services)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5);

            const pct = totalBookings > 0 ? ((b.count / totalBookings) * 100).toFixed(1) : '0.0';

            html += `
                <div class="tod-card">
                    <div class="tod-head">
                        <div class="tod-title">${b.range}</div>
                        <div class="tod-count">${b.count} จอง · ${pct}%</div>
                    </div>
            `;
            if (top.length === 0) {
                html += '<div class="no-data" style="padding:12px;">ไม่มีข้อมูล</div>';
            } else {
                top.forEach(([name, count], i) => {
                    html += `
                        <div class="tod-row">
                            <span><span class="tod-num">${i + 1}.</span> ${name}</span>
                            <span class="tod-num">${count}</span>
                        </div>
                    `;
                });
            }
            html += '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    }

    generateLeadTime() {
        // Lead time = startTime - createdAt (in hours)
        const samples = [];
        let skipped = 0;

        this.bookings.forEach(b => {
            if (!b.startTime || !b.startTime.seconds || !b.createdAt || !b.createdAt.seconds) {
                skipped += 1;
                return;
            }
            const leadHours = (b.startTime.seconds - b.createdAt.seconds) / 3600;
            // Drop nonsensical negatives (booking edited after start, etc.)
            if (leadHours < -1) {
                skipped += 1;
                return;
            }
            samples.push(Math.max(0, leadHours));
        });

        const container = document.getElementById('leadTimeAnalysis');
        if (samples.length === 0) {
            container.innerHTML = '<div class="no-data">ไม่มีข้อมูล lead time ในช่วงนี้</div>';
            return;
        }

        // Stats
        const sum = samples.reduce((a, b) => a + b, 0);
        const avg = sum / samples.length;
        const sorted = [...samples].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];

        // Buckets (hours)
        const buckets = [
            { label: 'Same-day', range: '< 24 ชม.',  test: h => h < 24,                     count: 0 },
            { label: '1–3 วัน',  range: '24–72 ชม.', test: h => h >= 24 && h < 72,          count: 0 },
            { label: '4–7 วัน',  range: '3–7 วัน',   test: h => h >= 72 && h < 24 * 7,      count: 0 },
            { label: '7+ วัน',   range: '> 7 วัน',   test: h => h >= 24 * 7,                count: 0 }
        ];
        samples.forEach(h => {
            const b = buckets.find(b => b.test(h));
            if (b) b.count += 1;
        });

        const total = samples.length;
        const formatLead = h => h < 24
            ? `${h.toFixed(1)} ชม.`
            : `${(h / 24).toFixed(1)} วัน`;

        let html = `
            <div class="stat-grid">
                <div class="stat-tile">
                    <div class="stat-label">เฉลี่ย</div>
                    <div class="stat-value">${formatLead(avg)}</div>
                    <div class="stat-meta">จาก ${total} จอง</div>
                </div>
                <div class="stat-tile">
                    <div class="stat-label">Median</div>
                    <div class="stat-value">${formatLead(median)}</div>
                    <div class="stat-meta">ครึ่งหนึ่งจองล่วงหน้าน้อยกว่านี้</div>
                </div>
                <div class="stat-tile">
                    <div class="stat-label">Same-day</div>
                    <div class="stat-value">${total > 0 ? ((buckets[0].count / total) * 100).toFixed(1) : '0.0'}%</div>
                    <div class="stat-meta">${buckets[0].count} จอง · จองวันเดียวกัน</div>
                </div>
                <div class="stat-tile">
                    <div class="stat-label">ล่วงหน้า ≥ 1 วัน</div>
                    <div class="stat-value">${total > 0 ? (((total - buckets[0].count) / total) * 100).toFixed(1) : '0.0'}%</div>
                    <div class="stat-meta">${total - buckets[0].count} จอง</div>
                </div>
            </div>
            <div class="lt-dist">
        `;

        const maxCount = Math.max(...buckets.map(b => b.count), 1);
        buckets.forEach(b => {
            const pct = total > 0 ? (b.count / total) * 100 : 0;
            const barPct = (b.count / maxCount) * 100;
            html += `
                <div class="lt-bucket">
                    <div class="lt-bk-label">${b.label}</div>
                    <div class="lt-bk-count">${b.count}</div>
                    <div class="lt-bk-pct">${pct.toFixed(1)}% · ${b.range}</div>
                    <div class="pbar-wrap lt-bk-bar">
                        <div class="pbar-fill" style="width:${barPct}%"></div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        if (skipped > 0) {
            html += `<div style="margin-top:10px; font-size:11px; color:var(--muted);">
                * ข้าม ${skipped} จอง (ไม่มี createdAt หรือ startTime)
            </div>`;
        }

        container.innerHTML = html;
    }

    generateRevenueForecast() {
        const container = document.getElementById('forecastContainer');
        const base = this.forecastBaseBookings || [];

        if (base.length === 0) {
            container.innerHTML = '<div class="forecast-empty">ยังไม่มีข้อมูลย้อนหลังพอสำหรับการพยากรณ์</div>';
            // Clear chart if exists
            if (this.charts.forecast instanceof Chart) {
                this.charts.forecast.destroy();
                this.charts.forecast = null;
            }
            return;
        }

        // Aggregate base by dateKey -> revenue + dow
        const byDate = {};
        base.forEach(b => {
            if (!b.dateKey) return;
            if (!byDate[b.dateKey]) byDate[b.dateKey] = { revenue: 0, dow: null };
            const price = b.price || 0;
            const discount = b.discount || 0;
            byDate[b.dateKey].revenue += price * (1 - discount / 100);
        });

        // Compute DOW averages from base 28 days
        // dowSum[0..6] (0=Sun..6=Sat); dowCount = number of distinct days seen for that DOW
        const dowSum = [0, 0, 0, 0, 0, 0, 0];
        const dowDays = [0, 0, 0, 0, 0, 0, 0];

        // Pre-fill all 28 days so empty days count as 0 revenue (more honest forecast)
        const todayEnd = new Date(this.forecastBaseEnd);
        const startBase = new Date(this.forecastBaseStart);
        for (let d = new Date(startBase); d <= todayEnd; d.setDate(d.getDate() + 1)) {
            const key = SabaiUtils.formatDateKey(d);
            const rev = byDate[key] ? byDate[key].revenue : 0;
            const dow = d.getDay();
            dowSum[dow] += rev;
            dowDays[dow] += 1;
        }

        const dowAvg = dowSum.map((s, i) => dowDays[i] > 0 ? s / dowDays[i] : 0);

        // Predict next 7 days starting from tomorrow
        const dayLabelsTH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
        const future = [];
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        for (let i = 1; i <= 7; i++) {
            const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
            const dow = d.getDay();
            future.push({
                date: d,
                label: `${dayLabelsTH[dow]} ${d.getDate()}/${d.getMonth() + 1}`,
                predicted: dowAvg[dow]
            });
        }
        const total7 = future.reduce((a, f) => a + f.predicted, 0);
        const avgDay = total7 / 7;

        // Render hero + chart
        container.innerHTML = `
            <div class="forecast-hero">
                <div class="fh-total">${Math.round(total7).toLocaleString()} ฿</div>
                <div class="fh-meta">
                    คาดการณ์รวม 7 วันข้างหน้า · เฉลี่ย ${Math.round(avgDay).toLocaleString()} ฿/วัน<br>
                    <span style="opacity:.8;">อ้างอิงรายได้ 28 วันที่ผ่านมา (เฉลี่ยตามวันในสัปดาห์)</span>
                </div>
            </div>
            <div class="chart-wrap" style="height:220px;">
                <canvas id="forecastChart"></canvas>
            </div>
        `;

        const ctx = document.getElementById('forecastChart').getContext('2d');
        if (this.charts.forecast instanceof Chart) {
            this.charts.forecast.destroy();
            this.charts.forecast = null;
        }
        this.charts.forecast = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: future.map(f => f.label),
                datasets: [{
                    label: 'คาดการณ์รายได้',
                    data: future.map(f => Math.round(f.predicted)),
                    backgroundColor: 'rgba(160, 133, 98, 0.7)',
                    borderColor: '#6E5B3F',
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'คาดการณ์: ' + context.parsed.y.toLocaleString() + ' ฿';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => v.toLocaleString() + ' ฿' },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
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

