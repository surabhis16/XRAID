const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('xraid_token') || sessionStorage.getItem('xraid_token');
}

function authHeaders(): HeadersInit {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: {
        user_id: number;
        email: string;
        full_name: string | null;
        role: string;
    };
}

export interface PredictionResult {
    alert_id: number;
    prediction: string;
    attack_type: string;
    confidence: number;
    attack_type_confidence: number;
    rf_confidence: number;
    if_anomaly_score: number;
    ae_reconstruction_error: number;
}

export interface UploadResponse {
    status: string;
    total_flows_uploaded: number;
    total_flows_processed: number;
    predictions: Array<{
        alert_id: number;
        prediction: string;
        confidence: number;
    }>;
}

export interface Alert {
    alert_id: number;
    timestamp: string;
    prediction: string;
    attack_type: string;
    confidence: number;
    status: string;
    source_ip?: string;
    destination_ip?: string;
}

export interface AlertDetail {
    alert: Alert;
    shap_explanation: {
        top_features: Array<{
            feature: string;
            shap_value: number;
            feature_value: number;
            abs_shap: number;
        }>;
        summary: string;
        generated_at: string;
        shap_values: number[];
    };
    network_flow: Record<string, number>;
}

export interface Stats {
    total_alerts: number;
    total_attacks: number;
    total_benign: number;
    avg_confidence: number;
    attack_distribution: Record<string, number>;
    recent_alerts_count: number;
}

// Upload CSV file
export async function uploadCSV(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: formData,
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
    }
    return response.json();
}

// Get recent alerts
export async function getAlerts(limit = 20, skip = 0): Promise<Alert[]> {
    const response = await fetch(`${API_URL}/api/alerts?limit=${limit}&skip=${skip}`, {
        headers: authHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch alerts');
    return response.json();
}

// Get alert details with SHAP
export async function getAlertDetail(alertId: number): Promise<AlertDetail> {
    const response = await fetch(`${API_URL}/api/alerts/${alertId}`, {
        headers: authHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch alert');
    return response.json();
}

// Get dashboard stats
export async function getStats(): Promise<Stats> {
    const response = await fetch(`${API_URL}/api/stats`, {
        headers: authHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
}

// Update alert status
export async function updateAlertStatus(alertId: number, status: string, reviewedBy?: string) {
    const params = new URLSearchParams({ status })
    if (reviewedBy) params.append('reviewed_by', reviewedBy)

    const response = await fetch(`${API_URL}/api/alerts/${alertId}/status?${params}`, {
        method: 'PATCH',
        headers: authHeaders()
    });
    if (!response.ok) throw new Error('Failed to update status');
    return response.json();
}

// Delete alerts fn
export async function deleteAlert(alertId: number): Promise<void> {
    const response = await fetch(`${API_URL}/api/alerts/${alertId}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete alert');
}

export async function login(email: string, password: string): Promise<AuthResponse> {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
    }
    return response.json();
}

