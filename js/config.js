/**
 * DAILY HYDRATION TRACKER - CONFIGURATION & CONSTANTS
 * Handles Supabase URL, Anon Key, Local Storage keys, and demo fallback state.
 */

const APP_CONFIG = {
    APP_NAME: 'Daily Hydration Tracker',
    APP_VERSION: '1.0.0',

    // Supabase Credentials
    // You can paste your Supabase Project details here or configure them via the in-app Settings modal
    SUPABASE_URL: window.localStorage.getItem('DHT_SUPABASE_URL') || 'https://xyzcompany.supabase.co',
    SUPABASE_ANON_KEY: window.localStorage.getItem('DHT_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_development',

    // Storage Keys
    STORAGE_KEYS: {
        DEVICE_SALT: '_dht_device_salt_v1',
        DEVICE_TOKEN: '_dht_device_token_hash',
        CURRENT_USER: '_dht_current_user_session',
        DAILY_GOAL: '_dht_user_daily_goal',
        REMINDERS: '_dht_reminders_list',
        DEMO_DB: '_dht_offline_db_v1',
        LAST_REMINDER_CHECK: '_dht_last_reminder_ping'
    },

    // Check whether valid non-placeholder credentials exist
    isConfigured: function() {
        return Boolean(
            this.SUPABASE_URL && 
            this.SUPABASE_URL.startsWith('https://') && 
            !this.SUPABASE_URL.includes('xyzcompany.supabase.co') &&
            this.SUPABASE_ANON_KEY && 
            this.SUPABASE_ANON_KEY.length > 30 &&
            !this.SUPABASE_ANON_KEY.includes('dummy_anon_key')
        );
    },

    // Save credentials dynamically from settings modal
    saveCredentials: function(url, anonKey) {
        if (!url || !anonKey) return false;
        const cleanUrl = url.trim().replace(/\/$/, '');
        const cleanKey = anonKey.trim();
        
        window.localStorage.setItem('DHT_SUPABASE_URL', cleanUrl);
        window.localStorage.setItem('DHT_SUPABASE_ANON_KEY', cleanKey);
        this.SUPABASE_URL = cleanUrl;
        this.SUPABASE_ANON_KEY = cleanKey;
        return true;
    },

    // Clear saved credentials
    clearCredentials: function() {
        window.localStorage.removeItem('DHT_SUPABASE_URL');
        window.localStorage.removeItem('DHT_SUPABASE_ANON_KEY');
    }
};

window.APP_CONFIG = APP_CONFIG;
