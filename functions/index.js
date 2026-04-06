const functions  = require('firebase-functions');
const admin      = require('firebase-admin');
const axios      = require('axios');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// ─── Config ──────────────────────────────────────────────────────────────────
// ตั้งค่าใน functions/.env :
//   LINE_TOKEN=...
//   LINE_TO=...
//   MAIL_USER=...@gmail.com
//   MAIL_PASS=app-password
//   MAIL_TO=...@gmail.com

// LINE
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

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

async function sendLine(text) {
    const recipients = (process.env.LINE_TO || '').split(',').map(s => s.trim()).filter(Boolean);
    await Promise.all(recipients.map(async (to) => {
        try {
            await axios.post(
                LINE_PUSH_URL,
                { to, messages: [{ type: 'text', text }] },
                { headers: { Authorization: `Bearer ${process.env.LINE_TOKEN}`, 'Content-Type': 'application/json' } }
            );
            console.log(`✅ LINE sent to ${to}`);
        } catch (err) {
            console.error(`❌ LINE error (${to}):`, err.response?.data || err.message);
        }
    }));
}

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
        const lineText = buildLineText(summary);
        const emailHtml = buildEmailHtml(summary);
        const textBody  = lineText;

        await Promise.all([
            sendLine(lineText),
            sendEmail(subject, emailHtml, textBody),
        ]);

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
        await Promise.all([
            sendLine(buildLineText(summary)),
            sendEmail(subject, buildEmailHtml(summary), buildLineText(summary)),
        ]);

        res.send(`✅ ส่งแล้ว! วันที่ ${dateKey} | ${summary.enriched.length} คิว | รายได้ ${summary.totalRevenue.toLocaleString()}฿`);
    });
