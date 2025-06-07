const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

admin.initializeApp({
  projectId: 'support-100'
});

// تكوين Express
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// تكوين Nodemailer
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER || 'abdulaziz.aldhayabi@gmail.com',
        pass: process.env.EMAIL_PASS || 'bkio donp pasq kskb'
    },
    tls: {
        rejectUnauthorized: false
    }
});

// API endpoint لإرسال النموذج
app.post('/submit', async (req, res) => {
    try {
        const { name, email, phone, category, subject, message } = req.body;
        
        // التحقق من البيانات
        if (!name || !email || !phone || !subject || !message) {
            return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
        }
        
        // التحقق من صحة البريد الإلكتروني
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني غير صالح' });
        }
        
        // إنشاء رقم للطلب
        const ticketId = Date.now().toString().slice(-6);
        
        // حفظ البيانات في Firestore
        await admin.firestore().collection('tickets').doc(ticketId).set({
            id: ticketId,
            name,
            email,
            phone,
            category: category || 'غير محدد',
            subject,
            message,
            date: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`تم حفظ طلب جديد برقم: ${ticketId}`);
        
        // إرسال إيميل للمسؤول
        const adminMailOptions = {
            from: `"نظام الدعم الفني" <${process.env.EMAIL_USER || 'abdulaziz.aldhayabi@gmail.com'}>`,
            to: process.env.EMAIL_TO || 'abdulaziz.aldhayabi@gmail.com',
            subject: `طلب دعم فني جديد: ${subject}`,
            html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>طلب دعم فني جديد</h2>
                    <p><strong>رقم الطلب:</strong> #${ticketId}</p>
                    <p><strong>الاسم:</strong> ${name}</p>
                    <p><strong>البريد الإلكتروني:</strong> ${email}</p>
                    <p><strong>رقم الهاتف:</strong> ${phone}</p>
                    <p><strong>نوع المشكلة:</strong> ${category || 'غير محدد'}</p>
                    <p><strong>الموضوع:</strong> ${subject}</p>
                    <p><strong>الرسالة:</strong></p>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>
            `,
            replyTo: email
        };
        
        // إرسال إيميل تأكيد للمستخدم
        const userMailOptions = {
            from: `"نظام الدعم الفني" <${process.env.EMAIL_USER || 'abdulaziz.aldhayabi@gmail.com'}>`,
            to: email,
            subject: `تأكيد استلام طلب الدعم الفني: ${subject}`,
            html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>شكراً لتواصلك معنا</h2>
                    <p>مرحباً ${name}،</p>
                    <p>لقد استلمنا طلب الدعم الفني الخاص بك بنجاح. سنقوم بمراجعته والرد عليك في أقرب وقت ممكن.</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>رقم الطلب:</strong> #${ticketId}</p>
                        <p><strong>الموضوع:</strong> ${subject}</p>
                        <p><strong>تاريخ الاستلام:</strong> ${new Date().toLocaleString('ar-SA')}</p>
                    </div>
                    <p>نشكرك على ثقتك بنا.</p>
                    <p>مع تحيات فريق الدعم الفني</p>
                </div>
            `
        };
        
        try {
            // إرسال الإيميلات
            await transporter.sendMail(adminMailOptions);
            await transporter.sendMail(userMailOptions);
            
            console.log('تم إرسال الإيميلات بنجاح');
            
            res.status(200).json({ 
                success: true, 
                message: 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً.',
                ticketId
            });
        } catch (emailError) {
            console.error('خطأ في إرسال البريد الإلكتروني:', emailError);
            // حتى لو فشل إرسال البريد الإلكتروني، نعتبر العملية ناجحة لأننا حفظنا البيانات
            res.status(200).json({ 
                success: true, 
                message: 'تم استلام طلبك بنجاح! سنتواصل معك قريباً.',
                ticketId
            });
        }
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.' });
    }
});

// تصدير وظيفة API
exports.api = functions.https.onRequest(app);