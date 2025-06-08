const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');

admin.initializeApp({
  projectId: 'support-100'
});

// تكوين Express
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تبسيط تكوين multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

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

// API endpoint لاختبار الخادم
app.get('/', (req, res) => {
    res.send('نظام الدعم الفني يعمل بنجاح!');
});

// API endpoint لإرسال النموذج
app.post('/submit', upload.single('attachment'), async (req, res) => {
    try {
        console.log('تم استلام طلب جديد:', req.body);
        console.log('الملف المرفق:', req.file ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : 'لا يوجد ملف مرفق');
        
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
        
        // إعداد بيانات الطلب
        const ticketData = {
            id: ticketId,
            name,
            email,
            phone,
            category: category || 'غير محدد',
            subject,
            message,
            date: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // إضافة معلومات الملف المرفق إذا وجد
        let attachments = [];
        let tempFilePath;
        
        if (req.file) {
            // حفظ الملف مؤقتًا
            tempFilePath = path.join(os.tmpdir(), req.file.originalname);
            fs.writeFileSync(tempFilePath, req.file.buffer);
            
            ticketData.attachment = {
                filename: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            };
            
            attachments.push({
                filename: req.file.originalname,
                content: req.file.buffer
            });
            
            console.log('تم إرفاق ملف:', req.file.originalname);
        }
        
        // حفظ البيانات في Firestore
        await admin.firestore().collection('tickets').doc(ticketId).set(ticketData);
        
        console.log(`تم حفظ طلب جديد برقم: ${ticketId}`);
        
        // طباعة معلومات تكوين البريد الإلكتروني للتصحيح
        console.log('معلومات تكوين البريد الإلكتروني:');
        console.log('- EMAIL_USER:', process.env.EMAIL_USER || 'abdulaziz.aldhayabi@gmail.com');
        console.log('- EMAIL_TO:', process.env.EMAIL_TO || 'abdulaziz.aldhayabi@gmail.com');
        
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
            
            // حذف الملف المؤقت بعد إرسال الإيميلات
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً.',
                ticketId
            });
        } catch (emailError) {
            console.error('خطأ مفصل في إرسال البريد الإلكتروني:', emailError);
            
            // حذف الملف المؤقت في حالة الخطأ
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            
            // حتى لو فشل إرسال البريد الإلكتروني، نعتبر العملية ناجحة لأننا حفظنا البيانات
            res.status(200).json({ 
                success: true, 
                message: 'تم استلام طلبك بنجاح! سنتواصل معك قريباً.',
                ticketId
            });
        }
    } catch (error) {
        console.error('خطأ كامل:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.' });
    }
});

// تصدير وظيفة API
exports.api = functions.https.onRequest(app);