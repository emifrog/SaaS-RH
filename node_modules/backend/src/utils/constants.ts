export const ROLES = {
  USER: 'USER',
  FORMATEUR: 'FORMATEUR',
  CHEF_CENTRE: 'CHEF_CENTRE',
  ADMIN_SDIS: 'ADMIN_SDIS',
} as const;

export const GRADES = [
  'SAP2', 'SAP1', 'CAP', 'CCH', 'SGT', 'SCH', 
  'ADJ', 'ADC', 'LTN', 'CNE', 'CDT', 'LCL', 'COL'
] as const;

export const TYPES_CENTRES = {
  CIS: 'Centre d\'Incendie et de Secours',
  CSP: 'Centre de Secours Principal',
  CPI: 'Centre de Première Intervention',
} as const;

export const FMPA_RULES = {
  MIN_INSCRITS: 5,
  MAX_INSCRITS: 15,
  NOTIFICATION_J_MINUS_7: 7,
  NOTIFICATION_J_MINUS_1: 1,
  EXPORT_DAY: 5, // Export TTA avant le 5 de chaque mois
} as const;

export const JWT_ERRORS = {
  INVALID_TOKEN: 'Token invalide',
  EXPIRED_TOKEN: 'Token expiré',
  NO_TOKEN: 'Token manquant',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;
