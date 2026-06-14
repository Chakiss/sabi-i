const functions  = require('firebase-functions');
const admin      = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// ─── Config ──────────────────────────────────────────────────────────────────
// ตั้งค่าใน functions/.env :
//   MAIL_USER=...@gmail.com
//   MAIL_PASS=app-password
//   MAIL_TO=...@gmail.com

// Gmail transporter (สร้างครั้งเดียวต่อ invocation)
function createTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const THAI_DAYS_FULL = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

function formatTimestamp(ts) {
    if (!ts) return '--:--';
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    return d.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(dateKey) {
    if (!dateKey) return '-';
    const [y, m, d] = dateKey.split('-');
    return `${d}/${m}/${y}`;
}

function formatDateThai(dateKey) {
    if (!dateKey) return '-';
    const [y, m, d] = dateKey.split('-');
    return `${parseInt(d)} ${THAI_MONTHS[parseInt(m) - 1]} ${y}`;
}

function formatDateThaiPush(dateKey) {
    if (!dateKey) return '-';
    const [y, m, d] = dateKey.split('-').map(Number);
    const dayName = THAI_DAYS_FULL[new Date(y, m - 1, d).getDay()];
    return `${dayName} ${d} ${THAI_MONTHS_SHORT[m - 1]} ${y}`;
}

function durationMinutes(start, end) {
    if (!start || !end) return 0;
    const s = start.toDate ? start.toDate() : new Date(start.seconds * 1000);
    const e = end.toDate ? end.toDate() : new Date(end.seconds * 1000);
    return Math.max(0, Math.round((e - s) / 60000));
}

function formatTimeRange(start, end) {
    return `${formatTimestamp(start)}–${formatTimestamp(end)}`;
}

function paymentLabel(method) {
    if (method === 'transfer') return 'โอน';
    if (method === 'cash')     return 'สด';
    return '-';
}

function todayKey() {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

async function getTherapistName(therapistId) {
    if (!therapistId) return '-';
    const snap = await db.collection('therapists').doc(therapistId).get();
    return snap.exists ? (snap.data().name || therapistId) : therapistId;
}

async function getServiceName(serviceId) {
    if (!serviceId) return 'ไม่มีบริการ';
    const snap = await db.collection('services').doc(serviceId).get();
    return snap.exists ? (snap.data().name || serviceId) : serviceId;
}

// ─── Senders ─────────────────────────────────────────────────────────────────

async function sendEmail(subject, htmlBody, textBody) {
    try {
        const transporter = createTransporter();
        await transporter.sendMail({
            from: `"Saba-i Booking" <${process.env.MAIL_USER}>`,
            to:   process.env.MAIL_TO,
            subject,
            text: textBody,
            html: htmlBody,
        });
        console.log('✅ Email sent');
    } catch (err) {
        console.error('❌ Email error:', err.message);
    }
}

// ─── Daily Summary Builder ────────────────────────────────────────────────────

async function buildDailySummary(dateKey) {
    const snap = await db.collection('bookings')
        .where('dateKey', '==', dateKey)
        .get();

    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (bookings.length === 0) {
        return null; // ไม่มีการจอง ไม่ต้องส่ง
    }

    // ดึงชื่อนักบำบัดและบริการพร้อมกัน
    const enriched = await Promise.all(
        bookings.map(async (b) => {
            const [therapistName, serviceName] = await Promise.all([
                getTherapistName(b.therapistId),
                getServiceName(b.serviceId),
            ]);
            return { ...b, therapistName, serviceName };
        })
    );

    // เรียงตามเวลาเริ่ม
    enriched.sort((a, b) => {
        const ta = a.startTime?.seconds || 0;
        const tb = b.startTime?.seconds || 0;
        return ta - tb;
    });

    const totalRevenue = enriched.reduce((sum, b) => sum + (b.price || 0), 0);
    const totalFee     = enriched.reduce((sum, b) => sum + (b.therapistFee || 0), 0);
    const netRevenue   = totalRevenue - totalFee;

    // สรุปตามนักบำบัด
    const byTherapist = {};
    for (const b of enriched) {
        const name = b.therapistName;
        if (!byTherapist[name]) byTherapist[name] = { count: 0, revenue: 0, fee: 0 };
        byTherapist[name].count++;
        byTherapist[name].revenue += (b.price || 0);
        byTherapist[name].fee     += (b.therapistFee || 0);
    }

    return { dateKey, enriched, totalRevenue, totalFee, netRevenue, byTherapist };
}

function buildLineText(summary) {
    const { dateKey, enriched, totalRevenue, totalFee, netRevenue, byTherapist } = summary;
    const lines = [
        `📊 สรุปยอดประจำวัน — ${formatDate(dateKey)}`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📋 จำนวนการจอง : ${enriched.length} คิว`,
        `💰 รายได้รวม   : ${totalRevenue.toLocaleString()}฿`,
        `🤝 ค่ามือรวม   : ${totalFee.toLocaleString()}฿`,
        `✨ กำไรสุทธิ   : ${netRevenue.toLocaleString()}฿`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `👥 สรุปรายบุคคล`,
    ];

    for (const [name, stat] of Object.entries(byTherapist)) {
        lines.push(`• ${name}: ${stat.count} คิว | รายได้ ${stat.revenue.toLocaleString()}฿ | ค่ามือ ${stat.fee.toLocaleString()}฿`);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📝 รายละเอียด`);

    for (const b of enriched) {
        const time = `${formatTimestamp(b.startTime)}–${formatTimestamp(b.endTime)}`;
        const disc = b.discount > 0 ? ` (-${b.discount}%)` : '';
        lines.push(`• ${b.therapistName} ${time} | ${b.serviceName} | ${(b.price || 0).toLocaleString()}฿${disc} | ${paymentLabel(b.paymentMethod)}`);
        if (b.note) lines.push(`  📝 ${b.note}`);
    }

    return lines.join('\n');
}

function buildEmailHtml(summary) {
    const { dateKey, enriched, totalRevenue, totalFee, netRevenue, byTherapist } = summary;

    const therapistRows = Object.entries(byTherapist).map(([name, stat]) => `
        <tr>
            <td style="padding:8px 12px">${name}</td>
            <td style="padding:8px 12px;text-align:center">${stat.count}</td>
            <td style="padding:8px 12px;text-align:right">${stat.revenue.toLocaleString()}฿</td>
            <td style="padding:8px 12px;text-align:right">${stat.fee.toLocaleString()}฿</td>
            <td style="padding:8px 12px;text-align:right;color:#16a34a;font-weight:600">${(stat.revenue - stat.fee).toLocaleString()}฿</td>
        </tr>`).join('');

    const bookingRows = enriched.map(b => {
        const disc = b.discount > 0 ? ` <span style="color:#ef4444">(-${b.discount}%)</span>` : '';
        return `
        <tr>
            <td style="padding:8px 12px">${formatTimestamp(b.startTime)}–${formatTimestamp(b.endTime)}</td>
            <td style="padding:8px 12px">${b.therapistName}</td>
            <td style="padding:8px 12px">${b.serviceName}</td>
            <td style="padding:8px 12px;text-align:right">${(b.price || 0).toLocaleString()}฿${disc}</td>
            <td style="padding:8px 12px;text-align:right">${(b.therapistFee || 0).toLocaleString()}฿</td>
            <td style="padding:8px 12px;text-align:center">${paymentLabel(b.paymentMethod)}</td>
            <td style="padding:8px 12px;color:#64748b;font-size:12px">${b.note || ''}</td>
        </tr>`;
    }).join('');

    return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:720px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px">
        <div style="background:linear-gradient(135deg,#4c9fff,#6366f1);border-radius:10px;padding:20px 24px;margin-bottom:20px">
            <p style="margin:0;color:white;font-size:20px;font-weight:700">📊 สรุปยอดประจำวัน</p>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:15px">${formatDate(dateKey)}</p>
        </div>

        <!-- KPI Cards -->
        <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
            <div style="flex:1;min-width:140px;background:white;border-radius:10px;padding:16px;border:1px solid #e2e8f0;text-align:center">
                <div style="font-size:28px;font-weight:700;color:#6366f1">${enriched.length}</div>
                <div style="font-size:13px;color:#64748b;margin-top:4px">จำนวนคิว</div>
            </div>
            <div style="flex:1;min-width:140px;background:white;border-radius:10px;padding:16px;border:1px solid #e2e8f0;text-align:center">
                <div style="font-size:22px;font-weight:700;color:#0ea5e9">${totalRevenue.toLocaleString()}฿</div>
                <div style="font-size:13px;color:#64748b;margin-top:4px">รายได้รวม</div>
            </div>
            <div style="flex:1;min-width:140px;background:white;border-radius:10px;padding:16px;border:1px solid #e2e8f0;text-align:center">
                <div style="font-size:22px;font-weight:700;color:#f59e0b">${totalFee.toLocaleString()}฿</div>
                <div style="font-size:13px;color:#64748b;margin-top:4px">ค่ามือรวม</div>
            </div>
            <div style="flex:1;min-width:140px;background:white;border-radius:10px;padding:16px;border:1px solid #e2e8f0;text-align:center">
                <div style="font-size:22px;font-weight:700;color:#16a34a">${netRevenue.toLocaleString()}฿</div>
                <div style="font-size:13px;color:#64748b;margin-top:4px">กำไรสุทธิ</div>
            </div>
        </div>

        <!-- By Therapist -->
        <div style="background:white;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:20px">
            <div style="padding:12px 16px;background:#f1f5f9;font-weight:600;font-size:14px">👥 สรุปรายบุคคล</div>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
                <thead>
                    <tr style="background:#f8fafc">
                        <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600">นักบำบัด</th>
                        <th style="padding:8px 12px;text-align:center;color:#64748b;font-weight:600">คิว</th>
                        <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">รายได้</th>
                        <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">ค่ามือ</th>
                        <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">กำไร</th>
                    </tr>
                </thead>
                <tbody>${therapistRows}</tbody>
            </table>
        </div>

        <!-- Booking Detail -->
        <div style="background:white;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
            <div style="padding:12px 16px;background:#f1f5f9;font-weight:600;font-size:14px">📝 รายละเอียดการจอง</div>
            <div style="overflow-x:auto">
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                        <tr style="background:#f8fafc">
                            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600">เวลา</th>
                            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600">นักบำบัด</th>
                            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600">บริการ</th>
                            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">ราคา</th>
                            <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600">ค่ามือ</th>
                            <th style="padding:8px 12px;text-align:center;color:#64748b;font-weight:600">ชำระ</th>
                            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600">หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>${bookingRows}</tbody>
                </table>
            </div>
        </div>

        <p style="margin-top:16px;font-size:12px;color:#94a3b8;text-align:center">Saba-i Booking Board</p>
    </div>`;
}

// ─── Scheduled Daily Summary ──────────────────────────────────────────────────
// ส่งสรุปทุกวัน เวลา 21:00 น. (เวลาไทย)

exports.dailySummary = functions
    .region('asia-southeast1')
    .pubsub.schedule('0 21 * * *')
    .timeZone('Asia/Bangkok')
    .onRun(async () => {
        const dateKey = todayKey();
        console.log(`📊 Running daily summary for ${dateKey}`);

        const summary = await buildDailySummary(dateKey);

        if (!summary) {
            console.log('ℹ️ No bookings today — skipping notification');
            return null;
        }

        const subject = `Saba-i Massage สรุปยอดวันที่ ${formatDateThai(dateKey)}`;
        const emailHtml = buildEmailHtml(summary);
        const textBody  = buildLineText(summary);

        await sendEmail(subject, emailHtml, textBody);

        console.log(`✅ Daily summary sent for ${dateKey}`);
        return null;
    });

// ─── HTTP Test Endpoint (ลบออกหลังเทสเสร็จ) ───────────────────────────────────

exports.testDailySummary = functions
    .region('asia-southeast1')
    .https.onRequest(async (req, res) => {
        const dateKey = req.query.date || todayKey();
        console.log(`🧪 Test summary for ${dateKey}`);

        const summary = await buildDailySummary(dateKey);
        if (!summary) {
            res.send(`ℹ️ ไม่มีการจองในวันที่ ${dateKey}`);
            return;
        }

        const subject = `Saba-i Massage สรุปยอดวันที่ ${formatDateThai(dateKey)}`;
        await sendEmail(subject, buildEmailHtml(summary), buildLineText(summary));

        res.send(`✅ ส่งแล้ว! วันที่ ${dateKey} | ${summary.enriched.length} คิว | รายได้ ${summary.totalRevenue.toLocaleString()}฿`);
    });

// ─── FCM Push Notification Helper ────────────────────────────────────────────

// Per-type icons. Drop new PNGs into public/icons/ and swap the paths to
// differentiate notification types visually on Chrome / Android / Mac Safari.
const PUSH_ICONS = {
    'new-booking':         '/icons/icon-192.png',
    'edit-booking':        '/icons/icon-192.png',
    'delete-booking':      '/icons/icon-192.png',
    'incomplete-booking':  '/icons/icon-192.png',
    'daily-summary':       '/icons/icon-192.png',
    'new-reservation':     '/icons/icon-192.png',
};

async function sendPushNotification(title, body, tag) {
    try {
        // Get all admin device tokens
        const devicesSnap = await db.collection('admin_devices').get();
        if (devicesSnap.empty) {
            console.log('ℹ️ No admin devices registered for push');
            return;
        }

        // Deduplicate tokens (same device may register multiple times)
        const tokens = [...new Set(devicesSnap.docs.map(doc => doc.data().token).filter(Boolean))];
        if (tokens.length === 0) return;

        // Send data-only message — no `notification` field
        // This prevents FCM from auto-displaying a notification
        // Our service worker handles display manually (single notification)
        const message = {
            data: {
                title: title,
                body: body,
                tag: tag || 'booking',
                icon: PUSH_ICONS[tag] || '/icons/icon-192.png',
                click_action: '/index.html'
            },
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`📲 Push sent: ${response.successCount} success, ${response.failureCount} failed`);

        // Clean up invalid tokens
        if (response.failureCount > 0) {
            const invalidTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const code = resp.error?.code;
                    if (code === 'messaging/invalid-registration-token' ||
                        code === 'messaging/registration-token-not-registered') {
                        invalidTokens.push(tokens[idx]);
                    }
                }
            });

            // Delete invalid device docs
            if (invalidTokens.length > 0) {
                const batch = db.batch();
                const invalidDocs = devicesSnap.docs.filter(doc =>
                    invalidTokens.includes(doc.data().token)
                );
                invalidDocs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                console.log(`🗑️ Removed ${invalidDocs.length} invalid device tokens`);
            }
        }
    } catch (error) {
        console.error('❌ Push notification error:', error.message);
    }
}

// ─── Booking Notification Triggers ───────────────────────────────────────────

// Title: "[icon prefix] • [therapist] [start time]"
function buildPushTitle(prefix, therapistName, booking) {
    return `${prefix} • ${therapistName} ${formatTimestamp(booking.startTime)}`;
}

// Body for new booking (full detail)
function buildCreateBody(booking, serviceName) {
    const lines = [
        `📅 ${formatDateThaiPush(booking.dateKey)}`,
        `⏰ ${formatTimeRange(booking.startTime, booking.endTime)} (${durationMinutes(booking.startTime, booking.endTime)} นาที)`,
        `💆 ${serviceName}`,
    ];
    let priceLine = `💰 ${(booking.price || 0).toLocaleString()}฿`;
    if (booking.discount > 0) priceLine += ` (ส่วนลด ${booking.discount}%)`;
    lines.push(priceLine);
    lines.push(`💳 ${paymentLabel(booking.paymentMethod)}`);
    if (booking.note) lines.push(`📝 ${booking.note}`);
    return lines.join('\n');
}

// Body for deleted booking (price + payment combined on one line)
function buildDeleteBody(booking, serviceName) {
    const lines = [
        `📅 ${formatDateThaiPush(booking.dateKey)}`,
        `⏰ ${formatTimeRange(booking.startTime, booking.endTime)} (${durationMinutes(booking.startTime, booking.endTime)} นาที)`,
        `💆 ${serviceName}`,
        `💰 ${(booking.price || 0).toLocaleString()}฿ • 💳 ${paymentLabel(booking.paymentMethod)}`,
    ];
    if (booking.note) lines.push(`📝 ${booking.note}`);
    return lines.join('\n');
}

// Body for updated booking — lead with what changed so the diff is visible
// in iOS collapsed view (only first ~2 body lines), then the full booking state.
function buildUpdateBody(after, serviceName, changes) {
    const lines = [];
    if (changes.length > 0) {
        for (const c of changes) lines.push(`🔄 ${c}`);
        lines.push('');
    }
    lines.push(`📅 ${formatDateThaiPush(after.dateKey)}`);
    lines.push(`⏰ ${formatTimeRange(after.startTime, after.endTime)} (${durationMinutes(after.startTime, after.endTime)} นาที)`);
    lines.push(`💆 ${serviceName} • ${(after.price || 0).toLocaleString()}฿ • ${paymentLabel(after.paymentMethod)}`);
    return lines.join('\n');
}

// New booking created
exports.onBookingCreated = functions
    .region('asia-southeast1')
    .firestore.document('bookings/{bookingId}')
    .onCreate(async (snap) => {
        const booking = snap.data();
        const [therapistName, serviceName] = await Promise.all([
            getTherapistName(booking.therapistId),
            getServiceName(booking.serviceId)
        ]);

        await sendPushNotification(
            buildPushTitle('🆕 จองใหม่', therapistName, booking),
            buildCreateBody(booking, serviceName),
            'new-booking'
        );
    });

// Booking updated
exports.onBookingUpdated = functions
    .region('asia-southeast1')
    .firestore.document('bookings/{bookingId}')
    .onUpdate(async (change) => {
        const before = change.before.data();
        const after = change.after.data();

        const [therapistName, serviceName] = await Promise.all([
            getTherapistName(after.therapistId),
            getServiceName(after.serviceId)
        ]);

        const changes = [];
        if (before.therapistId !== after.therapistId) {
            const oldName = await getTherapistName(before.therapistId);
            changes.push(`หมอ: ${oldName} → ${therapistName}`);
        }
        if (before.startTime?.seconds !== after.startTime?.seconds ||
            before.endTime?.seconds !== after.endTime?.seconds) {
            changes.push(`เวลา: ${formatTimeRange(before.startTime, before.endTime)} → ${formatTimeRange(after.startTime, after.endTime)}`);
        }
        if (before.serviceId !== after.serviceId) {
            const oldService = await getServiceName(before.serviceId);
            changes.push(`บริการ: ${oldService} → ${serviceName}`);
        }
        if (before.price !== after.price) {
            changes.push(`ราคา: ${(before.price || 0).toLocaleString()}฿ → ${(after.price || 0).toLocaleString()}฿`);
        }

        await sendPushNotification(
            buildPushTitle('✏️ แก้ไข', therapistName, after),
            buildUpdateBody(after, serviceName, changes),
            'edit-booking'
        );
    });

// Booking deleted
exports.onBookingDeleted = functions
    .region('asia-southeast1')
    .firestore.document('bookings/{bookingId}')
    .onDelete(async (snap) => {
        const booking = snap.data();
        const [therapistName, serviceName] = await Promise.all([
            getTherapistName(booking.therapistId),
            getServiceName(booking.serviceId)
        ]);

        await sendPushNotification(
            buildPushTitle('🗑️ ยกเลิก', therapistName, booking),
            buildDeleteBody(booking, serviceName),
            'delete-booking'
        );
    });

// ─── Daily Summary Push Notification ─────────────────────────────────────────
// Also send push notification with daily summary at 21:00

exports.dailySummaryPush = functions
    .region('asia-southeast1')
    .pubsub.schedule('0 21 * * *')
    .timeZone('Asia/Bangkok')
    .onRun(async () => {
        const dateKey = todayKey();
        const summary = await buildDailySummary(dateKey);

        if (!summary) {
            await sendPushNotification(
                '📊 สรุปวันนี้',
                'ไม่มีการจองวันนี้ 😴',
                'daily-summary'
            );
            return null;
        }

        const therapistList = Object.entries(summary.byTherapist)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([name, stat]) => `${name} ${stat.count}`)
            .join(' • ');

        const body = [
            `📅 ${formatDateThaiPush(dateKey)}`,
            `💰 รายได้: ${summary.totalRevenue.toLocaleString()}฿`,
            `🤝 ค่ามือ: ${summary.totalFee.toLocaleString()}฿`,
            `✨ กำไรสุทธิ: ${summary.netRevenue.toLocaleString()}฿`,
            '',
            `👥 ${therapistList}`,
        ].join('\n');

        await sendPushNotification(
            `📊 สรุปวันนี้ • ${summary.enriched.length} คิว`,
            body,
            'daily-summary'
        );

        return null;
    });

// ─── Incomplete Booking Reminder ─────────────────────────────────────────────
// เตือนทุก 15:00 / 18:00 / 21:00 ถ้ามี booking วันนี้ที่จบไปแล้ว
// แต่ยังขาด serviceId หรือ paymentMethod

async function runIncompleteBookingCheck(triggerLabel) {
    const dateKey = todayKey();
    const now = new Date();
    const nowSec = Math.floor(now.getTime() / 1000);

    const snap = await db.collection('bookings')
        .where('dateKey', '==', dateKey)
        .get();

    const incomplete = [];
    for (const doc of snap.docs) {
        const b = { id: doc.id, ...doc.data() };
        const endSec = b.endTime?.seconds || 0;
        if (endSec === 0 || endSec > nowSec) continue; // ยังไม่จบ

        const missingService = !b.serviceId;
        const missingPayment = !b.paymentMethod || (b.paymentMethod !== 'cash' && b.paymentMethod !== 'transfer');
        if (!missingService && !missingPayment) continue;

        b._missingService = missingService;
        b._missingPayment = missingPayment;
        incomplete.push(b);
    }

    if (incomplete.length === 0) {
        console.log(`ℹ️ [${triggerLabel}] No incomplete bookings`);
        return null;
    }

    // Enrich with therapist + service names
    const enriched = await Promise.all(incomplete.map(async (b) => {
        const [therapistName, serviceName] = await Promise.all([
            getTherapistName(b.therapistId),
            b.serviceId ? getServiceName(b.serviceId) : Promise.resolve(null),
        ]);
        return { ...b, therapistName, serviceName };
    }));

    // Sort by start time
    enriched.sort((a, b) => (a.startTime?.seconds || 0) - (b.startTime?.seconds || 0));

    // Header: trigger time + date on one line. Then per-booking block:
    //   <n>. <therapist> <time>  (<existing fields>)
    //      ❌ ยังไม่ระบุ: <missing fields>
    // Blank line between bookings for readability in expanded view.
    const lines = [`🕐 เช็คเมื่อ ${triggerLabel} • ${formatDateThaiPush(dateKey)}`];
    enriched.forEach((b, idx) => {
        const existing = [];
        if (b.serviceName) existing.push(b.serviceName);
        existing.push(`${(b.price || 0).toLocaleString()}฿`);
        if (!b._missingPayment) existing.push(paymentLabel(b.paymentMethod));

        const missing = [];
        if (b._missingService) missing.push('บริการ');
        if (b._missingPayment) missing.push('การชำระ');

        if (idx > 0) lines.push('');
        lines.push(`${idx + 1}. ${b.therapistName} ${formatTimeRange(b.startTime, b.endTime)}  (${existing.join(' • ')})`);
        lines.push(`   ❌ ยังไม่ระบุ: ${missing.join(', ')}`);
    });

    await sendPushNotification(
        `⚠️ ลงข้อมูลไม่ครบ • ${incomplete.length} คิว`,
        lines.join('\n'),
        'incomplete-booking'
    );

    console.log(`✅ [${triggerLabel}] Sent reminder: ${incomplete.length} incomplete bookings`);
    return null;
}

exports.incompleteBookingCheck15 = functions
    .region('asia-southeast1')
    .pubsub.schedule('0 15 * * *')
    .timeZone('Asia/Bangkok')
    .onRun(() => runIncompleteBookingCheck('15:00'));

exports.incompleteBookingCheck18 = functions
    .region('asia-southeast1')
    .pubsub.schedule('0 18 * * *')
    .timeZone('Asia/Bangkok')
    .onRun(() => runIncompleteBookingCheck('18:00'));

exports.incompleteBookingCheck21 = functions
    .region('asia-southeast1')
    .pubsub.schedule('0 21 * * *')
    .timeZone('Asia/Bangkok')
    .onRun(() => runIncompleteBookingCheck('21:00'));

// HTTP test endpoint
exports.testIncompleteBookingCheck = functions
    .region('asia-southeast1')
    .https.onRequest(async (req, res) => {
        const label = req.query.label || 'TEST';
        await runIncompleteBookingCheck(label);
        res.send(`✅ Incomplete booking check run (${label})`);
    });

// ─── Customer Reservation Request (from landing page) ────────────────────────

function formatPreferredDate(dateKey) {
    if (!dateKey) return '-';
    const [y, m, d] = dateKey.split('-').map(Number);
    if (!y || !m || !d) return dateKey;
    const dayName = THAI_DAYS_FULL[new Date(y, m - 1, d).getDay()];
    return `${dayName} ${d} ${THAI_MONTHS_SHORT[m - 1]} ${y}`;
}

function buildReservationBody(req) {
    const lines = [];
    lines.push(`👤 ${req.name || '-'} • ${req.phone || '-'}`);

    const serviceLine = req.serviceName
        ? (req.duration ? `💆 ${req.serviceName} • ${req.duration} นาที` : `💆 ${req.serviceName}`)
        : '💆 ยังไม่เลือกบริการ';
    lines.push(serviceLine);

    lines.push(`📅 ${formatPreferredDate(req.preferredDate)} ⏰ ${req.preferredTime || '-'}`);

    if (req.price) lines.push(`💰 ${Number(req.price).toLocaleString()}฿`);
    if (req.guests && Number(req.guests) > 1) lines.push(`👥 ${req.guests} ท่าน`);
    if (req.email) lines.push(`✉️ ${req.email}`);
    if (req.notes) lines.push(`📝 ${req.notes}`);

    return lines.join('\n');
}

exports.onReservationRequestCreated = functions
    .region('asia-southeast1')
    .firestore.document('reservationRequests/{requestId}')
    .onCreate(async (snap) => {
        const req = snap.data() || {};
        const name = req.name || 'ลูกค้า';

        await sendPushNotification(
            `🌿 จองใหม่จากเว็บ • ${name}`,
            buildReservationBody(req),
            'new-reservation'
        );
    });
