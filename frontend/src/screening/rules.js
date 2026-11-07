import { AUTO_FIELDS, NEAR_VA_RANK, PERSONAL_FIELDS } from './config'

export function nearVaWorseThanN6(value) {
  const rank = NEAR_VA_RANK[value]
  return rank != null && rank > 6
}

export function nearVaIsN5OrN6(value) {
  return value === 'N5' || value === 'N6'
}

export function ageYears(dob, asOf = new Date()) {
  if (!dob) return null
  const birth = new Date(`${String(dob).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  let years = asOf.getFullYear() - birth.getFullYear()
  const m = asOf.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && asOf.getDate() < birth.getDate())) years -= 1
  return years
}

export function ageGroupFromYears(years) {
  if (years == null) return ''
  if (years < 35) return 'Under 35'
  if (years <= 49) return '35–49'
  if (years <= 64) return '50–64'
  return '65+'
}

export function computeQ11(dob, asOf) {
  const years = ageYears(dob, asOf)
  if (years == null) return ''
  return years >= 35 ? 'Yes' : 'No'
}

export function computeQ12(dob, asOf) {
  return ageGroupFromYears(ageYears(dob, asOf))
}

export function computeQ21(right, left) {
  const values = [right || '', left || '']
  if (values.includes('Cannot read 6/12')) return 'Fail'
  if (values.includes('Not tested')) return 'Incomplete'
  if (values.every((v) => v === 'Reads 6/12 or better')) return 'Pass'
  return 'Incomplete'
}

export function computeQ25(owned, ownVa) {
  return owned === 'Yes' && nearVaIsN5OrN6(ownVa) ? 'Yes' : 'No'
}

export function computeQ27(unaided) {
  return nearVaWorseThanN6(unaided) ? 'Yes' : 'No'
}

export function applyAutoFields(form, asOf = new Date()) {
  const data = { ...form }
  const dob = data.q14_dob || data._client_dob
  const iso = asOf.toISOString().slice(0, 10)
  data.q3_date_of_service = iso
  data.q11_aged_35_plus = computeQ11(dob, asOf)
  data.q12_age_group = computeQ12(dob, asOf)
  data.q21_distance_outcome = computeQ21(
    data.q19_distance_va_right,
    data.q20_distance_va_left,
  )
  data.q25_own_glasses_adequate = computeQ25(
    data.q23_owned_reading_glasses,
    data.q24_near_va_own_glasses,
  )
  data.q27_nvi_confirmed = computeQ27(data.q26_near_va_unaided)
  return data
}

export function applyDerivedSets(form) {
  const data = { ...form }
  let reasons = [...(data.q34_referral_reasons || [])]

  const ensure = (label) => {
    if (!reasons.includes(label)) reasons = [...reasons, label]
  }
  const drop = (label) => {
    reasons = reasons.filter((r) => r !== label)
  }

  if (data.q28_red_flags === 'Yes') {
    data.q29_glasses_provided = 'No'
    data.q29b_reason_not_provided = 'Red flag, referred before glasses given'
    data.q33_referred = 'Yes'
  }

  if (data.q21_distance_outcome === 'Fail') {
    data.q33_referred = 'Yes'
    ensure('Failed distance VA')
  } else {
    drop('Failed distance VA')
  }

  if (data.q29_glasses_provided === 'Yes' && nearVaWorseThanN6(data.q31_near_va_dispensed)) {
    data.q33_referred = 'Yes'
    ensure('Near vision not corrected to N6')
  } else {
    drop('Near vision not corrected to N6')
  }

  if (data.q28_red_flags === 'Yes') {
    data.q33_referred = 'Yes'
  }

  data.q34_referral_reasons = reasons

  if (data.q29_glasses_provided === 'No') {
    data.q41_comments = ''
  } else if (
    data.q29_glasses_provided === 'Yes' &&
    nearVaIsN5OrN6(data.q31_near_va_dispensed)
  ) {
    if (!(data.q41_comments || '').trim()) {
      data.q41_comments = 'Presbyopia was corrected'
    }
  } else if (data.q41_comments === 'Presbyopia was corrected') {
    data.q41_comments = ''
  }

  return data
}

export function applyAllRules(form, asOf = new Date()) {
  return applyDerivedSets(applyAutoFields(form, asOf))
}

export function visibility(form) {
  const consented = form.q2_consent_personal === 'Yes'
  const engaged = form.q1_part_a_explained === 'Yes'
  const under35 = form.q11_aged_35_plus === 'No'
  const stopUnder35 = under35 && engaged
  const showSectionD =
    engaged &&
    !stopUnder35 &&
    form.q25_own_glasses_adequate === 'No' &&
    form.q27_nvi_confirmed === 'Yes'
  const ownedYes = form.q23_owned_reading_glasses === 'Yes'
  const notTested =
    form.q19_distance_va_right === 'Not tested' ||
    form.q20_distance_va_left === 'Not tested'
  const glassesNo = form.q29_glasses_provided === 'No'
  const redYes = form.q28_red_flags === 'Yes'
  const referred = form.q33_referred === 'Yes'
  const phoneNone = form.q37_has_mobile_phone === 'None'
  const smsYes = form.q38_sms_consent === 'Yes'

  return {
    form_active: engaged,
    end_no_engage: form.q1_part_a_explained === 'Client did not engage',
    stop_under_35: stopUnder35,
    anonymous_track: !consented,
    section_a: engaged,
    section_b: engaged,
    section_c: engaged && !stopUnder35,
    section_d: showSectionD,
    section_e: engaged && !stopUnder35,
    section_f: engaged && !stopUnder35,
    q5b: form.q5_cadre === 'Other',
    q7b: form.q7_subcounty === 'Other',
    q8b: form.q8_distribution_point === 'Other',
    q9b: form.q9_facility === 'Other',
    q10b: form.q10_implementing_partner === 'Other',
    q13: consented,
    q14: consented,
    q16: consented,
    q17: consented,
    q17b: consented && form.q17_occupation === 'Other',
    q22: notTested,
    q24: ownedYes,
    q28b: redYes,
    q29: showSectionD,
    q29b: showSectionD && glassesNo,
    q29c: showSectionD && glassesNo && form.q29b_reason_not_provided === 'Other',
    q30: showSectionD && !glassesNo,
    q31: showSectionD && !glassesNo,
    q32: showSectionD && !glassesNo,
    q34: referred,
    q34b: referred && (form.q34_referral_reasons || []).includes('Other'),
    q35: referred,
    q36b: (form.q36_how_heard || []).includes('Other'),
    q38: !phoneNone,
    q39: !phoneNone && smsYes && consented,
    q40: !phoneNone && smsYes,
    q40b: !phoneNone && smsYes && form.q40_sms_language === 'Other',
  }
}

export { AUTO_FIELDS, PERSONAL_FIELDS }
