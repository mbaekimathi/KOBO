export const FORM_TITLE = 'Eyeglasses Pilot Screening'
export const FORM_SCOPE = 'Homa Bay & Meru 2026'

export const Q1_OPTIONS = ['Yes', 'Client did not engage']
export const YES_NO = ['Yes', 'No']

export const CADRE_OPTIONS = [
  'CHP',
  'CHA',
  'Nurse',
  'Clinical Officer',
  'Doctor or Ophthalmologist',
  'Public Health Officer',
  'Pharmacist',
  'Other',
]

export const DISTRIBUTION_POINT_OPTIONS = [
  'Primary Health Facility',
  'KSB',
  'Community Health Unit (CHP outreach)',
  'Community outreach or baraza',
  'Pharmacy',
  'School',
  'Other',
]

export const IMPLEMENTING_PARTNER_OPTIONS = [
  'Public Sector (L1/L2/L3 Government Facility)',
  'Other',
]

export const AGE_GROUP_OPTIONS = ['Under 35', '35–49', '50–64', '65+']
export const SEX_OPTIONS = ['Male', 'Female']

export const DISTANCE_VA_OPTIONS = [
  'Reads 6/12 or better',
  'Cannot read 6/12',
  'Not tested',
]

export const NEAR_VA_OPTIONS = [
  'N5',
  'N6',
  'N8',
  'N10',
  'N12',
  'N14',
  'N18',
  'N24 or worse',
  'Not tested',
]

export const NEAR_VA_RANK = {
  N5: 5,
  N6: 6,
  N8: 8,
  N10: 10,
  N12: 12,
  N14: 14,
  N18: 18,
  'N24 or worse': 24,
  'Not tested': null,
}

export const GLASSES_NOT_PROVIDED_REASONS = [
  'Stock-out',
  'Client declined',
  'Already has appropriate glasses',
  'Red flag, referred before glasses given',
  'Other',
]

export const DIOPTRE_STRENGTHS = ['+1.00', '+1.50', '+2.00', '+2.50', '+3.00', '+3.50']

export const REFERRAL_REASON_OPTIONS = [
  'Failed distance VA',
  'Near vision not corrected to N6',
  'Abnormal appearance of eye',
  'Other visual symptom',
  'Other eye symptom',
  'Other',
]

export const HEARD_ABOUT_OPTIONS = [
  'CHP',
  'Clinic/health facility',
  'Community outreach/baraza',
  'Church/faith-based',
  'Radio',
  'Billboard/poster',
  'Social media',
  'Friend/family',
  'Other',
]

export const PHONE_TYPE_OPTIONS = ['Smartphone', 'Basic phone', 'None']

export const SMS_LANGUAGE_OPTIONS = [
  'Dholuo',
  'Kiswahili',
  'English',
  'Ekegusii',
  'Kuria',
  'Kimeru',
  'Kikuyu',
  'Other',
]

export const OCCUPATION_OPTIONS = ['Farmer', 'Retired', 'Formal employment', 'Other']

export const PERSONAL_FIELDS = [
  'q13_name',
  'q14_dob',
  'q16_ward_village',
  'q17_occupation',
  'q17b_occupation_other',
  'q39_phone_number',
]

export const AUTO_FIELDS = [
  'q3_date_of_service',
  'q11_aged_35_plus',
  'q12_age_group',
  'q21_distance_outcome',
  'q25_own_glasses_adequate',
  'q27_nvi_confirmed',
]

export const SECTIONS = [
  { id: 'disclosure', label: 'Disclosure' },
  { id: 'a', label: 'Service context' },
  { id: 'b', label: 'Demographics' },
  { id: 'c', label: 'Clinical' },
  { id: 'd', label: 'Reading glasses' },
  { id: 'e', label: 'Referral' },
  { id: 'f', label: 'Contact' },
]
