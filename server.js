require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// تكوين تخزين الملفات المرفقة
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }
        cb(null, uploadsDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
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

// تكوين Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'abdulaziz.aldhayabi@gmail.com',
        pass: process.env.EMAIL_PASS || 'bkio donp pasq kskb'
    },
    debug: true,
    logger: true
});

// التحقق من اتصال البريد الإلكتروني
transporter.verify(function(error, success) {
    if (error) {
        console.error('خطأ في تكوين البريد الإلكتروني:', error);
        console.error('تأكد من استخدام كلمة مرور التطبيق لحساب Gmail وليس كلمة المرور العادية');
    } else {
        console.log('الخادم جاهز لإرسال رسائل البريد الإلكتروني');
    }
});

// API endpoint لاختبار الخادم
app.get('/', (req, res) => {
    res.send('نظام الدعم الفني يعمل بنجاح!');
});

// API endpoint لإرسال النموذج
app.post('/submit', upload.single('attachment'), async (req, res) => {
    try {
        console.log('تم استلام طلب جديد:', req.body);
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
        
        // إضافة معلومات الملف المرفق إذا وجد
        if (req.file) {
            ticketData.attachment = {
                filename: req.file.originalname,
                path: req.file.path,
                size: req.file.size
            };
        }
        
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
        
        // طباعة معلومات تكوين البريد الإلكتروني للتصحيح
        console.log('معلومات تكوين البريد الإلكتروني:');
        console.log('- EMAIL_USER:', process.env.EMAIL_USER || 'abdulaziz.aldhayabi@gmail.com');
        console.log('- EMAIL_TO:', process.env.EMAIL_TO || 'abdulaziz.aldhayabi@gmail.com');
        
        // إعداد المرفقات للإيميل
        let attachments = [];
        if (req.file) {
            attachments.push({
                filename: req.file.originalname,
                path: req.file.path
            });
            console.log('تم إرفاق ملف:', req.file.originalname);
        }
        
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
                    ${req.file ? `<p><strong>مرفق:</strong> ${req.file.originalname}</p>` : ''}
                </div>
            `,
            replyTo: email,
            attachments: attachments
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
                        ${req.file ? `<p><strong>مرفق:</strong> ${req.file.originalname}</p>` : ''}
                    </div>
                    <p>نشكرك على ثقتك بنا.</p>
                    <p>مع تحيات فريق الدعم الفني</p>
                </div>
            `,
            attachments: attachments
        };
        
        try {
            console.log('جاري إرسال الإيميلات...');
            
            // إرسال إيميل للمسؤول
            const adminInfo = await transporter.sendMail(adminMailOptions);
            console.log('تم إرسال إيميل المسؤول بنجاح:', adminInfo.messageId);
            
            // إرسال إيميل للمستخدم
            const userInfo = await transporter.sendMail(userMailOptions);
            console.log('تم إرسال إيميل المستخدم بنجاح:', userInfo.messageId);
            
            res.status(200).json({ 
                success: true, 
                message: 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً.',
                ticketId
            });
        } catch (emailError) {
            console.error('خطأ مفصل في إرسال البريد الإلكتروني:', emailError);
            
            // حتى لو فشل إرسال البريد الإلكتروني، نعتبر العملية ناجحة لأننا حفظنا البيانات
            res.status(200).json({ 
                success: true, 
                message: 'تم استلام طلبك بنجاح! سنتواصل معك قريباً.',
                ticketId
            });
        }
    } catch (error) {
        console.error('خطأ عام في معالجة الطلب:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.' });
    }
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
    console.log(`Make sure to set up Gmail App Password as described in README.md`);
});