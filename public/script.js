document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('supportForm');
    const statusDiv = document.getElementById('status');
    const yearSpan = document.getElementById('year');
    
    // تعيين السنة الحالية في التذييل
    yearSpan.textContent = new Date().getFullYear();
    
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
        
        // جمع بيانات النموذج
        const formData = new FormData(form);
        const jsonData = {};
        
        formData.forEach((value, key) => {
            if (key !== 'attachment') {
                jsonData[key] = value;
            }
        });
        
        // إرسال البيانات إلى الخادم
        fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        })
        .then(response => {
            return response.json().then(data => {
                if (!response.ok) {
                    throw new Error(data.message || 'فشل الاتصال بالخادم');
                }
                return data;
            });
        })
        .then(data => {
            // إظهار رسالة النجاح
            showStatus(data.message, 'success');
            
            // إعادة تعيين النموذج
            form.reset();
            
            // تمرير إلى أعلى الصفحة
            window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(error => {
            // إظهار رسالة الخطأ
            showStatus('حدث خطأ أثناء إرسال النموذج. يرجى المحاولة مرة أخرى.', 'error');
            console.error('Error:', error);
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