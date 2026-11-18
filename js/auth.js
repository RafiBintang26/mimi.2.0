/**
 * DAILY HYDRATION TRACKER - AUTHENTICATION LOGIC (js/auth.js)
 * Handles login, registration, password validation, device checking, and route guarding.
 */

const Auth = {
    init: function() {
        this.checkRouteGuard();
        this.bindEvents();
        this.checkDeviceOnRegisterPage();
    },

    /**
     * Protect routes according to authentication and role
     */
    checkRouteGuard: function() {
        const user = SupabaseService.getCurrentUser();
        const currentPath = window.location.pathname.toLowerCase();

        const protectedUserPages = ['dashboard.html', 'statistics.html', 'profile.html'];
        const isUserPage = protectedUserPages.some(page => currentPath.endsWith(page));
        const isAdminPage = currentPath.endsWith('admin.html');
        const isAuthPage = currentPath.endsWith('login.html') || currentPath.endsWith('register.html');

        if ((isUserPage || isAdminPage) && !user) {
            window.location.href = 'login.html';
            return;
        }

        if (isAdminPage && user && user.role !== 'admin') {
            alert('Akses ditolak: Halaman ini hanya dapat diakses oleh Administrator.');
            window.location.href = 'dashboard.html';
            return;
        }

        if (isAuthPage && user) {
            window.location.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
        }
    },

    /**
     * Proactively inspect device on register page and warn if bound
     */
    checkDeviceOnRegisterPage: async function() {
        const registerForm = document.getElementById('register-form');
        const alertBox = document.getElementById('device-status-alert');
        if (!registerForm || !alertBox) return;

        try {
            const deviceHash = await DeviceSecurity.getDeviceFingerprintHash();
            const check = await SupabaseService.checkDeviceAvailability(deviceHash);

            if (!check.available) {
                alertBox.className = 'device-alert-box danger';
                alertBox.innerHTML = `
                    <div class="icon">🚫</div>
                    <div class="device-alert-content">
                        <h5>Perangkat Sudah Terdaftar</h5>
                        <p>Perangkat HP ini sudah terhubung dengan akun lain (<strong>@${Utils.escapeHtml(check.username || 'pengguna')}</strong>). Sesuai ketentuan, satu perangkat hanya diperbolehkan untuk satu akun. Silakan login menggunakan akun tersebut atau hubungi Admin untuk reset perangkat.</p>
                    </div>
                `;
                alertBox.style.display = 'flex';

                const submitBtn = document.getElementById('register-submit-btn');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Perangkat Tidak Memenuhi Syarat';
                    submitBtn.style.opacity = '0.6';
                    submitBtn.style.cursor = 'not-allowed';
                }
            } else {
                alertBox.className = 'device-alert-box';
                alertBox.innerHTML = `
                    <div class="icon">🔒</div>
                    <div class="device-alert-content">
                        <h5>Perangkat Terverifikasi</h5>
                        <p>Perangkat ini belum terhubung dengan akun mana pun dan siap digunakan untuk registrasi akun baru.</p>
                    </div>
                `;
                alertBox.style.display = 'flex';
            }
        } catch (e) {
            console.warn('Device check error:', e);
        }
    },

    bindEvents: function() {
        // Register form submit
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Login form submit
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout buttons
        document.querySelectorAll('.logout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
                    SupabaseService.signOut();
                }
            });
        });
    },

    /**
     * Handle registration flow
     */
    handleRegister: async function(e) {
        e.preventDefault();

        const submitBtn = document.getElementById('register-submit-btn');
        const fullName = document.getElementById('reg-fullname').value.trim();
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        const termsCheck = document.getElementById('reg-terms').checked;

        // Validations
        if (!fullName || fullName.length < 3) {
            Notifications.showToast('Registrasi Gagal', 'Nama lengkap minimal 3 karakter.', 'error');
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            Notifications.showToast('Registrasi Gagal', 'Username harus 3-20 karakter alfanumerik (tanpa spasi).', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Notifications.showToast('Registrasi Gagal', 'Format email tidak valid.', 'error');
            return;
        }

        if (password.length < 6) {
            Notifications.showToast('Registrasi Gagal', 'Kata sandi minimal 6 karakter.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            Notifications.showToast('Registrasi Gagal', 'Konfirmasi kata sandi tidak cocok.', 'error');
            return;
        }

        if (!termsCheck) {
            Notifications.showToast('Registrasi Gagal', 'Anda harus menyetujui ketentuan penggunaan.', 'warning');
            return;
        }

        // Processing
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            await SupabaseService.signUp(fullName, username, email, password);
            Notifications.showToast('Registrasi Berhasil! 🎉', 'Akun Anda telah dibuat dan terikat dengan perangkat ini.', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1200);
        } catch (err) {
            Notifications.showToast('Gagal Mendaftar', err.message || 'Terjadi kesalahan pada registrasi.', 'error');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    },

    /**
     * Handle login flow
     */
    handleLogin: async function(e) {
        e.preventDefault();

        const submitBtn = document.getElementById('login-submit-btn');
        const identifier = document.getElementById('login-identifier').value.trim();
        const password = document.getElementById('login-password').value;

        if (!identifier || !password) {
            Notifications.showToast('Login Gagal', 'Silakan masukkan email/username dan kata sandi.', 'warning');
            return;
        }

        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const user = await SupabaseService.signIn(identifier, password);
            Notifications.showToast('Login Berhasil', `Selamat datang kembali, ${user.full_name || user.username}!`, 'success');
            setTimeout(() => {
                if (user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1000);
        } catch (err) {
            Notifications.showToast('Login Gagal', err.message || 'Email atau password salah.', 'error');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    },

    /**
     * Helper for demo quick fill
     */
    fillDemoAccount: function(type = 'user') {
        const idInput = document.getElementById('login-identifier');
        const passInput = document.getElementById('login-password');
        if (!idInput || !passInput) return;

        if (type === 'admin') {
            idInput.value = 'admin@hydration.tracker';
            passInput.value = 'admin123';
            Notifications.showToast('Akun Admin Diisi', 'Klik tombol Masuk untuk masuk sebagai Administrator.', 'info');
        } else {
            idInput.value = 'user@hydration.tracker';
            passInput.value = 'user123';
            Notifications.showToast('Akun User Diisi', 'Klik tombol Masuk untuk masuk sebagai Pengguna.', 'info');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});

window.Auth = Auth;
