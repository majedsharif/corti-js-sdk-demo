// src/constants/index.ts

// ============================================
// Design Tokens / Colors
// ============================================
export const colors = {
  black: '#121212',
  meteorite: '#2B2B28',
  asteroid: '#666666',
  lunar: '#B3B3B3',
  spaceDust: '#F2F2F2',
  white: '#FFFFFF',
  
  // Semantic colors
  error: '#DC2626',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  success: '#059669',
  recording: '#DC2626',
} as const;

// ============================================
// API Configuration
// ============================================
const API_HOST = import.meta.env.VITE_API_HOST || 'localhost';
const API_PORT = import.meta.env.VITE_API_PORT || '5005';
const API_PROTOCOL = import.meta.env.VITE_API_PROTOCOL || 'http';
const WS_PROTOCOL = API_PROTOCOL === 'https' ? 'wss' : 'ws';

export const api = {
  baseUrl: `${API_PROTOCOL}://${API_HOST}:${API_PORT}`,
  wsUrl: `${WS_PROTOCOL}://${API_HOST}:${API_PORT}`,
  
  // REST endpoints
  endpoints: {
    health: '/api/health',
    templates: '/api/templates',
    interactions: '/api/interactions',
  },
  
  // WebSocket endpoints
  ws: {
    ambient: '/ws/ambient',
  },
} as const;

// Helper to build full URLs
export const buildUrl = (endpoint: string) => `${api.baseUrl}${endpoint}`;
export const buildWsUrl = (endpoint: string) => `${api.wsUrl}${endpoint}`;

// ============================================
// Fact Group Styling
// ============================================
export const factGroups: Record<string, { label: string; color: string; bg: string }> = {
  'chief-complaint': { label: 'Chief Complaint', color: '#DC2626', bg: '#FEF2F2' },
  'history-of-present-illness': { label: 'History of Present Illness', color: '#EA580C', bg: '#FFF7ED' },
  'past-medical-history': { label: 'Medical History', color: '#D97706', bg: '#FFFBEB' },
  'medications-prior-to-visit': { label: 'Medications', color: '#65A30D', bg: '#F7FEE7' },
  'allergies': { label: 'Allergies', color: '#0891B2', bg: '#ECFEFF' },
  'social-history': { label: 'Social History', color: '#7C3AED', bg: '#F5F3FF' },
  'family-history': { label: 'Family History', color: '#DB2777', bg: '#FDF2F8' },
  'review-of-systems': { label: 'Review of Systems', color: '#059669', bg: '#ECFDF5' },
  'physical-exam': { label: 'Physical Exam', color: '#2563EB', bg: '#EFF6FF' },
  'assessment': { label: 'Assessment', color: '#4F46E5', bg: '#EEF2FF' },
  'plan': { label: 'Plan', color: '#0D9488', bg: '#F0FDFA' },
  'demographics': { label: 'Demographics', color: '#6B7280', bg: '#F9FAFB' },
  'vital-signs': { label: 'Vitals', color: '#EF4444', bg: '#FEF2F2' },
};

// ============================================
// Document Generation
// ============================================
export const DEFAULT_TEMPLATE = {
  key: 'corti-soap',
  name: 'SOAP Note',
} as const;

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'da', name: 'Danish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
] as const;