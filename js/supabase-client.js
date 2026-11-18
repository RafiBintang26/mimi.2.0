/**
 * DAILY HYDRATION TRACKER - SUPABASE CLIENT & DATA ENGINE (js/supabase-client.js)
 * Fully supports real Supabase backend with Row Level Security (RLS)
 * + Automatic graceful fallback to offline simulation engine so everything works seamlessly.
 */

const SupabaseService = {
    client: null,
    isLive: false,

    /**
     * Initialize connection
     */
    init: function() {
        if (APP_CONFIG.isConfigured() && window.supabase && window.supabase.createClient) {
            try {
                this.client = window.supabase.createClient(
                    APP_CONFIG.SUPABASE_URL,
                    APP_CONFIG.SUPABASE_ANON_KEY,
                    {
                        auth: {
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: true
                        }
                    }
                );
                this.isLive = true;
                console.log('✅ Supabase connected to:', APP_CONFIG.SUPABASE_URL);
            } catch (err) {
                console.warn('⚠️ Supabase initialization failed, falling back to local simulation:', err);
                this.isLive = false;
            }
        } else {
            this.isLive = false;
            console.log('ℹ️ Running in Local Simulation Engine (Configure Supabase in Settings to go live)');
        }

        // Initialize local demo database if needed
        this._initDemoDb();
    },

    /**
     * Local storage simulation database for instant out-of-the-box functionality
     */
    _initDemoDb: function() {
        const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.DEMO_DB);
        if (!raw) {
            const todayStr = Utils.toDateString();
            const demoData = {
                profiles: [
                    {
                        id: 'usr-admin-001',
                        full_name: 'Administrator Tracker',
                        username: 'admin',
                        email: 'admin@hydration.tracker',
                        password_hash: 'admin123',
                        role: 'admin',
                        avatar_url: '',
                        is_active: true,
                        created_at: new Date(Date.now() - 86400000 * 30).toISOString()
                    },
                    {
                        id: 'usr-user-002',
                        full_name: 'Rafi Pratama',
                        username: 'rafipratama',
                        email: 'user@hydration.tracker',
                        password_hash: 'user123',
                        role: 'user',
                        avatar_url: '',
                        is_active: true,
                        created_at: new Date(Date.now() - 86400000 * 14).toISOString()
                    },
                    {
                        id: 'usr-user-003',
                        full_name: 'Siti Sarah',
                        username: 'sitisarah',
                        email: 'siti@example.com',
                        password_hash: 'siti123',
                        role: 'user',
                        avatar_url: '',
                        is_active: true,
                        created_at: new Date(Date.now() - 86400000 * 7).toISOString()
                    }
                ],
                devices: [
                    {
                        id: 'dev-001',
                        user_id: 'usr-admin-001',
                        device_token_hash: 'dev_token_admin_mock_hash_1234567890',
                        device_name: 'Desktop - Windows 11 (Chrome)',
                        registered_at: new Date(Date.now() - 86400000 * 30).toISOString(),
                        last_active_at: new Date().toISOString(),
                        status: 'active'
                    },
                    {
                        id: 'dev-002',
                        user_id: 'usr-user-002',
                        device_token_hash: 'dev_token_user_mock_hash_0987654321',
                        device_name: 'Smartphone - Android 14 (Chrome Mobile)',
                        registered_at: new Date(Date.now() - 86400000 * 14).toISOString(),
                        last_active_at: new Date().toISOString(),
                        status: 'active'
                    }
                ],
                daily_goals: [
                    { id: 'goal-001', user_id: 'usr-admin-001', target_ml: 2500, glass_size_ml: 250, date: todayStr },
                    { id: 'goal-002', user_id: 'usr-user-002', target_ml: 2000, glass_size_ml: 250, date: todayStr },
                    { id: 'goal-003', user_id: 'usr-user-003', target_ml: 2200, glass_size_ml: 300, date: todayStr }
                ],
                water_logs: [
                    { id: 'log-001', user_id: 'usr-user-002', amount_ml: 250, consumed_at: new Date(Date.now() - 14400000).toISOString(), date: todayStr },
                    { id: 'log-002', user_id: 'usr-user-002', amount_ml: 500, consumed_at: new Date(Date.now() - 7200000).toISOString(), date: todayStr },
                    { id: 'log-003', user_id: 'usr-user-003', amount_ml: 600, consumed_at: new Date(Date.now() - 10800000).toISOString(), date: todayStr },
                    { id: 'log-004', user_id: 'usr-user-003', amount_ml: 1200, consumed_at: new Date(Date.now() - 3600000).toISOString(), date: todayStr },
                    { id: 'log-005', user_id: 'usr-admin-001', amount_ml: 500, consumed_at: new Date(Date.now() - 18000000).toISOString(), date: todayStr }
                ],
                reminders: [
                    { id: 'rem-001', user_id: 'usr-user-002', reminder_time: '08:00', is_enabled: true },
                    { id: 'rem-002', user_id: 'usr-user-002', reminder_time: '11:00', is_enabled: true },
                    { id: 'rem-003', user_id: 'usr-user-002', reminder_time: '14:00', is_enabled: true },
                    { id: 'rem-004', user_id: 'usr-user-002', reminder_time: '17:00', is_enabled: true },
                    { id: 'rem-005', user_id: 'usr-user-002', reminder_time: '20:00', is_enabled: true }
                ]
            };

            // Seed historical data for charts (last 7 days for usr-user-002)
            for (let i = 1; i <= 6; i++) {
                const pastDate = new Date(Date.now() - 86400000 * i);
                const pastDateStr = Utils.toDateString(pastDate);
                const randomIntake = [1500, 1750, 2000, 2250, 2500][i % 5];
                demoData.daily_goals.push({
                    id: 'goal-hist-' + i,
                    user_id: 'usr-user-002',
                    target_ml: 2000,
                    glass_size_ml: 250,
                    date: pastDateStr
                });
                demoData.water_logs.push({
                    id: 'log-hist-' + i,
                    user_id: 'usr-user-002',
                    amount_ml: randomIntake,
                    consumed_at: pastDate.toISOString(),
                    date: pastDateStr
                });
            }

            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DEMO_DB, JSON.stringify(demoData));
        }
    },

    _getDemoDb: function() {
        return JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.DEMO_DB) || '{}');
    },

    _saveDemoDb: function(db) {
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DEMO_DB, JSON.stringify(db));
    },

    // --------------------------------------------------------------------------
    // DEVICE REGISTRATION & CHECK (1 HP = 1 Akun Rule)
    // --------------------------------------------------------------------------
    checkDeviceAvailability: async function(deviceHash) {
        if (this.isLive) {
            try {
                // Call Supabase RPC
                const { data, error } = await this.client.rpc('check_device_availability', {
                    p_device_hash: deviceHash
                });
                if (error) throw error;
                return data;
            } catch (err) {
                console.warn('RPC check failed, fallback to direct query:', err);
                const { data } = await this.client
                    .from('devices')
                    .select('id, user_id, status, profiles(username)')
                    .eq('device_token_hash', deviceHash)
                    .eq('status', 'active')
                    .maybeSingle();

                if (data) {
                    return {
                        available: false,
                        message: `Perangkat ini sudah terhubung dengan akun lain (${data.profiles?.username || 'User lain'}).`,
                        username: data.profiles?.username
                    };
                }
                return { available: true, message: 'Perangkat siap digunakan.' };
            }
        } else {
            // Local simulation check
            const db = this._getDemoDb();
            const existing = (db.devices || []).find(d => d.device_token_hash === deviceHash && d.status === 'active');
            if (existing) {
                const profile = (db.profiles || []).find(p => p.id === existing.user_id);
                return {
                    available: false,
                    message: `Perangkat ini sudah terhubung dengan akun lain (@${profile?.username || 'pengguna'}).`,
                    username: profile?.username
                };
            }
            return { available: true, message: 'Perangkat siap digunakan.' };
        }
    },

    bindDevice: async function(userId, deviceHash, deviceName) {
        if (this.isLive) {
            try {
                const { data, error } = await this.client.rpc('bind_user_device', {
                    p_user_id: userId,
                    p_device_hash: deviceHash,
                    p_device_name: deviceName
                });
                if (error) throw error;
                return data;
            } catch (err) {
                // Fallback insert
                const { error } = await this.client.from('devices').upsert({
                    user_id: userId,
                    device_token_hash: deviceHash,
                    device_name: deviceName,
                    status: 'active',
                    last_active_at: new Date().toISOString()
                }, { onConflict: 'device_token_hash' });
                if (error) throw error;
                return { success: true };
            }
        } else {
            const db = this._getDemoDb();
            db.devices = db.devices || [];

            // Revoke any previous device for this user
            db.devices.forEach(d => {
                if (d.user_id === userId) d.status = 'revoked';
            });

            // Add or activate
            const existingIdx = db.devices.findIndex(d => d.device_token_hash === deviceHash);
            if (existingIdx >= 0) {
                db.devices[existingIdx].user_id = userId;
                db.devices[existingIdx].device_name = deviceName;
                db.devices[existingIdx].status = 'active';
                db.devices[existingIdx].last_active_at = new Date().toISOString();
            } else {
                db.devices.push({
                    id: 'dev-' + Date.now(),
                    user_id: userId,
                    device_token_hash: deviceHash,
                    device_name: deviceName,
                    status: 'active',
                    registered_at: new Date().toISOString(),
                    last_active_at: new Date().toISOString()
                });
            }
            this._saveDemoDb(db);
            return { success: true };
        }
    },

    // --------------------------------------------------------------------------
    // AUTHENTICATION
    // --------------------------------------------------------------------------
    signUp: async function(fullName, username, email, password) {
        const deviceHash = await DeviceSecurity.getDeviceFingerprintHash();
        const deviceName = DeviceSecurity.getDeviceName();

        // 1. Verify device restriction
        const check = await this.checkDeviceAvailability(deviceHash);
        if (!check.available) {
            throw new Error(check.message);
        }

        if (this.isLive) {
            const { data, error } = await this.client.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        username: username,
                        role: 'user'
                    }
                }
            });
            if (error) throw error;

            if (data.user) {
                await this.bindDevice(data.user.id, deviceHash, deviceName);
            }
            return data;
        } else {
            // Local simulation sign up
            const db = this._getDemoDb();
            const exists = (db.profiles || []).some(p => p.email.toLowerCase() === email.toLowerCase() || p.username.toLowerCase() === username.toLowerCase());
            if (exists) {
                throw new Error('Email atau username sudah terdaftar.');
            }

            const newUserId = 'usr-' + Date.now();
            const newProfile = {
                id: newUserId,
                full_name: fullName,
                username: username,
                email: email,
                password_hash: password,
                role: 'user',
                avatar_url: '',
                is_active: true,
                created_at: new Date().toISOString()
            };

            db.profiles.push(newProfile);
            this._saveDemoDb(db);

            // Bind device
            await this.bindDevice(newUserId, deviceHash, deviceName);

            // Auto-login session in local simulation
            const sessionUser = {
                id: newUserId,
                email: email,
                username: username,
                full_name: fullName,
                role: 'user'
            };
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(sessionUser));
            return { user: sessionUser };
        }
    },

    signIn: async function(emailOrUsername, password) {
        const deviceHash = await DeviceSecurity.getDeviceFingerprintHash();
        const deviceName = DeviceSecurity.getDeviceName();

        if (this.isLive) {
            let email = emailOrUsername;
            // If username was provided, look up corresponding email
            if (!emailOrUsername.includes('@')) {
                const { data } = await this.client
                    .from('profiles')
                    .select('email')
                    .eq('username', emailOrUsername)
                    .maybeSingle();
                if (data && data.email) {
                    email = data.email;
                }
            }

            const { data, error } = await this.client.auth.signInWithPassword({
                email: email,
                password: password
            });
            if (error) throw error;

            // Fetch profile
            const { data: profile } = await this.client
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profile && !profile.is_active) {
                await this.client.auth.signOut();
                throw new Error('Akun Anda dinonaktifkan oleh Administrator.');
            }

            // Verify or bind device
            await this.bindDevice(data.user.id, deviceHash, deviceName);

            const sessionUser = {
                id: data.user.id,
                email: data.user.email,
                username: profile?.username || data.user.email.split('@')[0],
                full_name: profile?.full_name || 'User',
                role: profile?.role || 'user',
                avatar_url: profile?.avatar_url || ''
            };
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(sessionUser));
            return sessionUser;
        } else {
            // Local simulation sign in
            const db = this._getDemoDb();
            const identifier = emailOrUsername.toLowerCase().trim();
            const user = (db.profiles || []).find(p => 
                (p.email.toLowerCase() === identifier || p.username.toLowerCase() === identifier) &&
                p.password_hash === password
            );

            if (!user) {
                throw new Error('Email/username atau password salah.');
            }

            if (!user.is_active) {
                throw new Error('Akun Anda dinonaktifkan oleh Administrator.');
            }

            // Check if device is bound to someone else
            const conflictingDevice = (db.devices || []).find(d => 
                d.device_token_hash === deviceHash && d.status === 'active' && d.user_id !== user.id
            );
            if (conflictingDevice) {
                const conflictUser = (db.profiles || []).find(p => p.id === conflictingDevice.user_id);
                throw new Error(`Perangkat HP ini sudah terikat dengan akun lain (@${conflictUser?.username || 'user lain'}).`);
            }

            // Bind current device
            await this.bindDevice(user.id, deviceHash, deviceName);

            const sessionUser = {
                id: user.id,
                email: user.email,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                avatar_url: user.avatar_url || ''
            };
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(sessionUser));
            return sessionUser;
        }
    },

    signOut: async function() {
        if (this.isLive && this.client) {
            try {
                await this.client.auth.signOut();
            } catch (e) {
                console.warn('Signout warning:', e);
            }
        }
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER);
        window.location.href = 'login.html';
    },

    getCurrentUser: function() {
        const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.CURRENT_USER);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    },

    // --------------------------------------------------------------------------
    // DAILY GOALS & WATER INTAKE LOGS
    // --------------------------------------------------------------------------
    getDailyGoal: async function(userId, dateStr = Utils.toDateString()) {
        if (this.isLive) {
            const { data } = await this.client
                .from('daily_goals')
                .select('*')
                .eq('user_id', userId)
                .eq('date', dateStr)
                .maybeSingle();

            if (data) return data;
            // Return default if not set for today
            return { target_ml: 2000, glass_size_ml: 250 };
        } else {
            const db = this._getDemoDb();
            const goal = (db.daily_goals || []).find(g => g.user_id === userId && g.date === dateStr);
            if (goal) return goal;
            return { target_ml: 2000, glass_size_ml: 250 };
        }
    },

    setDailyGoal: async function(userId, targetMl, glassSizeMl, dateStr = Utils.toDateString()) {
        if (this.isLive) {
            const { data, error } = await this.client
                .from('daily_goals')
                .upsert({
                    user_id: userId,
                    target_ml: parseInt(targetMl, 10),
                    glass_size_ml: parseInt(glassSizeMl, 10),
                    date: dateStr
                }, { onConflict: 'user_id,date' })
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const db = this._getDemoDb();
            db.daily_goals = db.daily_goals || [];
            let goal = db.daily_goals.find(g => g.user_id === userId && g.date === dateStr);
            if (goal) {
                goal.target_ml = parseInt(targetMl, 10);
                goal.glass_size_ml = parseInt(glassSizeMl, 10);
            } else {
                goal = {
                    id: 'goal-' + Date.now(),
                    user_id: userId,
                    target_ml: parseInt(targetMl, 10),
                    glass_size_ml: parseInt(glassSizeMl, 10),
                    date: dateStr
                };
                db.daily_goals.push(goal);
            }
            this._saveDemoDb(db);
            return goal;
        }
    },

    getTodayLogs: async function(userId, dateStr = Utils.toDateString()) {
        if (this.isLive) {
            const { data, error } = await this.client
                .from('water_logs')
                .select('*')
                .eq('user_id', userId)
                .eq('date', dateStr)
                .order('consumed_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } else {
            const db = this._getDemoDb();
            return (db.water_logs || [])
                .filter(l => l.user_id === userId && l.date === dateStr)
                .sort((a, b) => new Date(b.consumed_at) - new Date(a.consumed_at));
        }
    },

    addWaterLog: async function(userId, amountMl, dateStr = Utils.toDateString()) {
        const amount = parseInt(amountMl, 10);
        if (isNaN(amount) || amount <= 0) throw new Error('Jumlah air tidak valid.');

        if (this.isLive) {
            const { data, error } = await this.client
                .from('water_logs')
                .insert({
                    user_id: userId,
                    amount_ml: amount,
                    consumed_at: new Date().toISOString(),
                    date: dateStr
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const db = this._getDemoDb();
            db.water_logs = db.water_logs || [];
            const newLog = {
                id: 'log-' + Date.now(),
                user_id: userId,
                amount_ml: amount,
                consumed_at: new Date().toISOString(),
                date: dateStr
            };
            db.water_logs.push(newLog);
            this._saveDemoDb(db);
            return newLog;
        }
    },

    deleteWaterLog: async function(logId) {
        if (this.isLive) {
            const { error } = await this.client
                .from('water_logs')
                .delete()
                .eq('id', logId);
            if (error) throw error;
            return true;
        } else {
            const db = this._getDemoDb();
            db.water_logs = (db.water_logs || []).filter(l => l.id !== logId);
            this._saveDemoDb(db);
            return true;
        }
    },

    // --------------------------------------------------------------------------
    // USER STATISTICS & HISTORY (7 & 30 Days)
    // --------------------------------------------------------------------------
    getUserStats: async function(userId, days = 7) {
        const result = [];
        const today = new Date();

        if (this.isLive) {
            const startDate = new Date();
            startDate.setDate(today.getDate() - (days - 1));
            const startStr = Utils.toDateString(startDate);

            const { data: logs } = await this.client
                .from('water_logs')
                .select('*')
                .eq('user_id', userId)
                .gte('date', startStr);

            const { data: goals } = await this.client
                .from('daily_goals')
                .select('*')
                .eq('user_id', userId)
                .gte('date', startStr);

            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                const dStr = Utils.toDateString(d);

                const dayLogs = (logs || []).filter(l => l.date === dStr);
                const total = dayLogs.reduce((acc, curr) => acc + curr.amount_ml, 0);
                const goalRec = (goals || []).find(g => g.date === dStr);
                const target = goalRec ? goalRec.target_ml : 2000;

                result.push({
                    date: dStr,
                    label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
                    total_ml: total,
                    target_ml: target,
                    achieved: total >= target
                });
            }
        } else {
            const db = this._getDemoDb();
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                const dStr = Utils.toDateString(d);

                const dayLogs = (db.water_logs || []).filter(l => l.user_id === userId && l.date === dStr);
                const total = dayLogs.reduce((acc, curr) => acc + curr.amount_ml, 0);
                const goalRec = (db.daily_goals || []).find(g => g.user_id === userId && g.date === dStr);
                const target = goalRec ? goalRec.target_ml : 2000;

                result.push({
                    date: dStr,
                    label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
                    total_ml: total,
                    target_ml: target,
                    achieved: total >= target
                });
            }
        }
        return result;
    },

    // --------------------------------------------------------------------------
    // ADMIN FUNCTIONS
    // --------------------------------------------------------------------------
    getAdminDashboardStats: async function() {
        if (this.isLive) {
            try {
                const { data, error } = await this.client.rpc('get_admin_dashboard_stats');
                if (error) throw error;
                return data;
            } catch (e) {
                console.warn('RPC admin stats fallback to calculation:', e);
            }
        }

        // Local or fallback calculation
        const db = this.isLive ? null : this._getDemoDb();
        const profiles = db ? db.profiles : [];
        const logs = db ? db.water_logs : [];
        const goals = db ? db.daily_goals : [];
        const todayStr = Utils.toDateString();

        const todayLogs = (logs || []).filter(l => l.date === todayStr);
        const activeUsersSet = new Set(todayLogs.map(l => l.user_id));
        const totalConsumed = todayLogs.reduce((acc, curr) => acc + curr.amount_ml, 0);

        let achievedCount = 0;
        let notAchievedCount = 0;

        (profiles || []).forEach(p => {
            const userTotal = todayLogs.filter(l => l.user_id === p.id).reduce((acc, curr) => acc + curr.amount_ml, 0);
            const userGoal = (goals || []).find(g => g.user_id === p.id && g.date === todayStr);
            const target = userGoal ? userGoal.target_ml : 2000;
            if (userTotal >= target) achievedCount++;
            else notAchievedCount++;
        });

        return {
            total_users: profiles.length,
            active_users_today: activeUsersSet.size,
            achieved_target_today: achievedCount,
            not_achieved_today: notAchievedCount,
            total_consumed_ml_today: totalConsumed
        };
    },

    getAdminUsersList: async function() {
        const todayStr = Utils.toDateString();

        if (this.isLive) {
            const { data: profiles, error } = await this.client
                .from('profiles')
                .select('*, devices(*)')
                .order('created_at', { ascending: false });
            if (error) throw error;

            const { data: todayLogs } = await this.client
                .from('water_logs')
                .select('*')
                .eq('date', todayStr);

            const { data: todayGoals } = await this.client
                .from('daily_goals')
                .select('*')
                .eq('date', todayStr);

            return (profiles || []).map(p => {
                const userTodayLogs = (todayLogs || []).filter(l => l.user_id === p.id);
                const consumedToday = userTodayLogs.reduce((acc, curr) => acc + curr.amount_ml, 0);
                const goal = (todayGoals || []).find(g => g.user_id === p.id);
                const target = goal ? goal.target_ml : 2000;
                const activeDevice = (p.devices || []).find(d => d.status === 'active');

                return {
                    id: p.id,
                    full_name: p.full_name,
                    username: p.username,
                    email: p.email,
                    role: p.role,
                    is_active: p.is_active,
                    created_at: p.created_at,
                    target_ml: target,
                    consumed_today_ml: consumedToday,
                    progress_pct: Utils.calcPercentage(consumedToday, target),
                    device_name: activeDevice ? activeDevice.device_name : 'Belum Terdaftar',
                    device_hash: activeDevice ? activeDevice.device_token_hash : ''
                };
            });
        } else {
            const db = this._getDemoDb();
            return (db.profiles || []).map(p => {
                const userTodayLogs = (db.water_logs || []).filter(l => l.user_id === p.id && l.date === todayStr);
                const consumedToday = userTodayLogs.reduce((acc, curr) => acc + curr.amount_ml, 0);
                const goal = (db.daily_goals || []).find(g => g.user_id === p.id && g.date === todayStr);
                const target = goal ? goal.target_ml : 2000;
                const activeDevice = (db.devices || []).find(d => d.user_id === p.id && d.status === 'active');

                return {
                    id: p.id,
                    full_name: p.full_name,
                    username: p.username,
                    email: p.email,
                    role: p.role,
                    is_active: p.is_active,
                    created_at: p.created_at,
                    target_ml: target,
                    consumed_today_ml: consumedToday,
                    progress_pct: Utils.calcPercentage(consumedToday, target),
                    device_name: activeDevice ? activeDevice.device_name : 'Belum Terdaftar',
                    device_hash: activeDevice ? activeDevice.device_token_hash : ''
                };
            });
        }
    },

    adminToggleUserStatus: async function(userId, newStatus) {
        if (this.isLive) {
            const { error } = await this.client
                .from('profiles')
                .update({ is_active: newStatus })
                .eq('id', userId);
            if (error) throw error;
            return true;
        } else {
            const db = this._getDemoDb();
            const user = (db.profiles || []).find(p => p.id === userId);
            if (user) {
                user.is_active = newStatus;
                this._saveDemoDb(db);
            }
            return true;
        }
    },

    adminUnbindDevice: async function(userId) {
        if (this.isLive) {
            try {
                await this.client.rpc('admin_unbind_user_device', { target_user_id: userId });
            } catch (e) {
                await this.client
                    .from('devices')
                    .update({ status: 'revoked' })
                    .eq('user_id', userId);
            }
            return true;
        } else {
            const db = this._getDemoDb();
            (db.devices || []).forEach(d => {
                if (d.user_id === userId) d.status = 'revoked';
            });
            this._saveDemoDb(db);
            return true;
        }
    }
};

// Initialize right away
SupabaseService.init();
window.SupabaseService = SupabaseService;
