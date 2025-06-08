document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('supportForm');
    const statusDiv = document.getElementById('status');
    const yearSpan = document.getElementById('year');
    
    // تعيين السنة الحالية في التذييل
    yearSpan.textContent = new Date().getFullYear();
    
    // تعيين عنوان API - تأكد من تحديث هذا العنوان بعنوان Render الفعلي
    const API_URL = 'https://support-system-api.onrender.com';
    
    // التحقق من صحة رقم الهاتف
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
    
    // إظهار اسم الملف المرفق
    const fileInput = document.getElementById('attachment');
    fileInput.addEventListener('change', function() {
        const fileName = this.files[0]?.name;
        if (fileName) {
            const small = this.nextElementSibling;
            small.textContent = `الملف المختار: ${fileName}`;
        }
    });
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // التحقق من الشروط
        if (!document.getElementById('terms').checked) {
            showStatus('يجب الموافقة على الشروط والأحكام للمتابعة', 'error');
            return;
        }
        
        // تغيير حالة الزر
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<span class="spinner"></span> جاري الإرسال...';
        submitButton.disabled = true;
        
        // إنشاء FormData بشكل صريح
        const formData = new FormData();
        
        // إضافة البيانات النصية
        formData.append('name', document.getElementById('name').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('phone', document.getElementById('phone').value);
        formData.append('category', document.getElementById('category').value);
        formData.append('subject', document.getElementById('subject').value);
        formData.append('message', document.getElementById('message').value);
        
        // إضافة الملف المرفق إذا وجد
        const fileInput = document.getElementById('attachment');
        if (fileInput.files.length > 0) {
            formData.append('attachment', fileInput.files[0]);
            console.log('تم إضافة ملف:', fileInput.files[0].name);
        }
        
        // طباعة محتويات FormData للتصحيح
        console.log('بيانات النموذج:');
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ' + (pair[1] instanceof File ? pair[1].name : pair[1]));
        }
        
        // إرسال البيانات إلى الخادم
        fetch(`${API_URL}/submit`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('استجابة الخادم:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('بيانات الاستجابة:', data);
            // إظهار رسالة النجاح
            showStatus(data.message, 'success');
            
            // إعادة تعيين النموذج
            form.reset();
            
            // إعادة تعيين نص الملف المرفق
            const small = fileInput.nextElementSibling;
            small.textContent = 'الحد الأقصى لحجم الملف: 5 ميجابايت';
            
            // تمرير إلى أعلى الصفحة
            window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(error => {
            // إظهار رسالة الخطأ
            console.error('خطأ في الإرسال:', error);
            showStatus('حدث خطأ أثناء إرسال النموذج. يرجى المحاولة مرة أخرى.', 'error');
            
            // إضافة خيار الحفظ المحلي في حالة فشل الاتصال بالخادم
            const saveLocallyBtn = document.createElement('button');
            saveLocallyBtn.textContent = 'حفظ الطلب محلياً';
            saveLocallyBtn.className = 'submit-btn';
            saveLocallyBtn.style.marginTop = '10px';
            saveLocallyBtn.style.backgroundColor = '#f39c12';
            
            saveLocallyBtn.addEventListener('click', function() {
                // إنشاء كائن لتخزين البيانات
                const jsonData = {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    phone: document.getElementById('phone').value,
                    category: document.getElementById('category').value,
                    subject: document.getElementById('subject').value,
                    message: document.getElementById('message').value,
                    ticketId: Date.now().toString().slice(-6),
                    date: new Date().toLocaleString('ar-SA')
                };
                
                // تخزين البيانات محلياً
                const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
                tickets.push(jsonData);
                localStorage.setItem('tickets', JSON.stringify(tickets));
                
                showStatus(`تم حفظ طلبك محلياً! رقم الطلب: #${jsonData.ticketId}`, 'success');
                form.reset();
                statusDiv.removeChild(saveLocallyBtn);
                
                // إعادة تعيين نص الملف المرفق
                const small = fileInput.nextElementSibling;
                small.textContent = 'الحد الأقصى لحجم الملف: 5 ميجابايت';
            });
            
            if (!statusDiv.querySelector('button')) {
                statusDiv.appendChild(saveLocallyBtn);
            }
        })
        .finally(() => {
            // إعادة تفعيل الزر
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        });
    });
    
    // دالة لإظهار رسائل الحالة
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        
        // تمرير تلقائي إلى رسالة الحالة
        statusDiv.scrollIntoView({ behavior: 'smooth' });
        
        // إخفاء الرسالة بعد 5 ثوانٍ إذا كانت ناجحة
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }
    
    // إضافة تأثيرات التحقق من الحقول
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.checkValidity()) {
                this.style.borderColor = '#4CAF50';
            } else if (this.value) {
                this.style.borderColor = '#e74c3c';
            } else {
                this.style.borderColor = '#ddd';
            }
        });
    });
});