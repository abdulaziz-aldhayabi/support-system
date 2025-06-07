require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// إنشاء مجلد للملفات المرفقة إذا لم يكن موجودًا
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// تكوين تخزين الملفات المرفقة
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// تكوين حدود الملفات المرفقة
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 ميجابايت
    fileFilter: function(req, file, cb) {
        // السماح بأنواع الملفات الشائعة فقط
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('نوع الملف غير مدعوم'));
        }
    }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// تكوين Nodemailer للإرسال المباشر
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// التحقق من اتصال البريد الإلكتروني
transporter.verify(function(error, success) {
    if (error) {
        console.error('خطأ في تكوين البريد الإلكتروني:', error);
        console.error('تأكد من استخدام كلمة مرور التطبيق لحساب Gmail وليس كلمة المرور العادية');
        console.error('يمكنك إنشاء كلمة مرور التطبيق من: https://myaccount.google.com/apppasswords');
    } else {
        console.log('الخادم جاهز لإرسال رسائل البريد الإلكتروني');
    }
});

// تم نقل هذا الكود إلى داخل الوعد (Promise) الخاص بإنشاء حساب الاختبار

// API endpoint لإرسال النموذج
app.post('/api/submit', async (req, res) => {
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
        const ticketData = {
            id: ticketId,
            name,
            email,
            phone,
            category: category || 'غير محدد',
            subject,
            message,
            date: new Date().toLocaleString('ar-SA')
        };
        
        // إنشاء مجلد للطلبات إذا لم يكن موجودًا
        const ticketsDir = path.join(__dirname, 'tickets');
        if (!fs.existsSync(ticketsDir)) {
            fs.mkdirSync(ticketsDir);
        }
        
        // حفظ الطلب في ملف JSON
        fs.writeFileSync(
            path.join(ticketsDir, `ticket-${ticketId}.json`),
            JSON.stringify(ticketData, null, 2),
            'utf8'
        );
        
        console.log(`تم حفظ طلب جديد برقم: ${ticketId}`);
        
        // إرسال إيميل للمسؤول
        const adminMailOptions = {
            from: `"نظام الدعم الفني" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_TO,
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
            from: `"نظام الدعم الفني" <${process.env.EMAIL_USER}>`,
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
            const adminInfo = await transporter.sendMail(adminMailOptions);
            const userInfo = await transporter.sendMail(userMailOptions);
            
            console.log('تم إرسال إيميل للمسؤول:', adminInfo.messageId);
            console.log('تم إرسال إيميل للمستخدم:', userInfo.messageId);
            
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

// معالجة الملفات المرفقة
app.post('/api/upload', upload.single('attachment'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'لم يتم تحميل أي ملف' });
    }
    
    res.status(200).json({ 
        success: true, 
        message: 'تم رفع الملف بنجاح',
        file: {
            filename: req.file.filename,
            path: req.file.path
        }
    });
});

// معالجة الأخطاء
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: err.message || 'حدث خطأ في الخادم'
    });
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
    console.log(`Make sure to set up Gmail App Password as described in README.md`);
});