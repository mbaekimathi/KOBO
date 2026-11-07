import { FORM_SCOPE, FORM_TITLE } from '../screening/config'
import { visibility } from '../screening/rules'

function formatDate(value) {
  if (!value) return '—'
  const raw = String(value).slice(0, 10)
  const date = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function display(value) {
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  return String(value)
}

function Row({ label, value }) {
  return (
    <div className="screening-doc__row">
      <dt>{label}</dt>
      <dd>{display(value)}</dd>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="screening-doc__section">
      <h3>{title}</h3>
      <dl className="screening-doc__grid">{children}</dl>
    </section>
  )
}

export default function ScreeningDocument({ form, onEdit, meta }) {
  if (!form) return null
  const vis = visibility(form)
  const redFlagsLabel =
    form.q28_red_flags === 'Yes'
      ? 'Yes'
      : form.q28_red_flags === 'No'
        ? 'No red flags'
        : form.q28_red_flags

  return (
    <article className="screening-doc panel">
      <header className="screening-doc__header">
        <div>
          <p className="screening-doc__eyebrow">{FORM_SCOPE}</p>
          <h2>{FORM_TITLE}</h2>
          {meta ? <p className="screening-doc__meta">{meta}</p> : null}
        </div>
        {onEdit ? (
          <button type="button" className="btn btn--secondary btn--small" onClick={onEdit}>
            Edit
          </button>
        ) : null}
      </header>

      <Section title="0. Disclosure">
        <Row label="Q1 Part A explained" value={form.q1_part_a_explained} />
        {vis.form_active ? (
          <Row label="Q2 Consent to personal details" value={form.q2_consent_personal} />
        ) : null}
      </Section>

      {vis.section_a ? (
        <Section title="A. Service context">
          <Row label="Q3 Date of service" value={formatDate(form.q3_date_of_service)} />
          <Row label="Q4 Provider name" value={form.q4_provider_name} />
          <Row label="Q5 Cadre" value={form.q5_cadre} />
          {vis.q5b ? <Row label="Q5b Specify cadre" value={form.q5b_cadre_other} /> : null}
          <Row label="Q6 County" value={form.q6_county} />
          <Row label="Q7 Sub-county" value={form.q7_subcounty} />
          {vis.q7b ? <Row label="Q7b Specify sub-county" value={form.q7b_subcounty_other} /> : null}
          <Row label="Q8 Distribution point type" value={form.q8_distribution_point} />
          {vis.q8b ? (
            <Row label="Q8b Specify distribution point" value={form.q8b_distribution_point_other} />
          ) : null}
          <Row label="Q9 Facility or outreach site" value={form.q9_facility} />
          {vis.q9b ? <Row label="Q9b Specify facility" value={form.q9b_facility_other} /> : null}
          <Row label="Q10 Implementing partner" value={form.q10_implementing_partner} />
          {vis.q10b ? (
            <Row label="Q10b Specify partner" value={form.q10b_implementing_partner_other} />
          ) : null}
        </Section>
      ) : null}

      {vis.section_b ? (
        <Section title="B. Client demographics">
          <Row label="Q11 Aged 35+ this year" value={form.q11_aged_35_plus} />
          <Row label="Q12 Age group" value={form.q12_age_group} />
          {vis.q13 ? <Row label="Q13 Name" value={form.q13_name} /> : null}
          {vis.q14 ? <Row label="Q14 Date of birth" value={formatDate(form.q14_dob)} /> : null}
          <Row label="Q15 Sex" value={form.q15_sex} />
          {vis.q16 ? <Row label="Q16 Ward / village" value={form.q16_ward_village} /> : null}
          {vis.q17 ? <Row label="Q17 Occupation" value={form.q17_occupation} /> : null}
          {vis.q17b ? (
            <Row label="Q17b Specify occupation" value={form.q17b_occupation_other} />
          ) : null}
        </Section>
      ) : null}

      {vis.section_c ? (
        <Section title="C. Clinical screening">
          <Row label="Q18 Wears distance glasses" value={form.q18_wears_distance_glasses} />
          <Row label="Q19 Distance VA right eye" value={form.q19_distance_va_right} />
          <Row label="Q20 Distance VA left eye" value={form.q20_distance_va_left} />
          <Row label="Q21 Distance outcome" value={form.q21_distance_outcome} />
          {vis.q22 ? <Row label="Q22 Reason not tested" value={form.q22_reason_not_tested} /> : null}
          <Row label="Q23 Already owned reading glasses" value={form.q23_owned_reading_glasses} />
          {vis.q24 ? (
            <Row label="Q24 Near VA with own glasses" value={form.q24_near_va_own_glasses} />
          ) : null}
          <Row label="Q25 Own glasses adequate" value={form.q25_own_glasses_adequate} />
          <Row label="Q26 Near VA unaided" value={form.q26_near_va_unaided} />
          <Row label="Q27 Near-vision impairment confirmed" value={form.q27_nvi_confirmed} />
          <Row label="Q28 Red flags" value={redFlagsLabel} />
          {vis.q28b ? <Row label="Q28b Red flag details" value={form.q28b_red_flags_detail} /> : null}
        </Section>
      ) : null}

      {vis.section_d ? (
        <Section title="D. Reading glasses">
          <Row label="Q29 Glasses provided" value={form.q29_glasses_provided} />
          {vis.q29b ? (
            <Row label="Q29b Reason not provided" value={form.q29b_reason_not_provided} />
          ) : null}
          {vis.q29c ? <Row label="Q29c Specify reason" value={form.q29c_reason_other} /> : null}
          {vis.q30 ? <Row label="Q30 Dioptre strength" value={form.q30_dioptre_strength} /> : null}
          {vis.q31 ? (
            <Row label="Q31 Near VA with dispensed glasses" value={form.q31_near_va_dispensed} />
          ) : null}
          {vis.q32 ? <Row label="Q32 First pair" value={form.q32_first_pair} /> : null}
        </Section>
      ) : null}

      {vis.section_e ? (
        <Section title="E. Referral">
          <Row label="Q33 Referred" value={form.q33_referred} />
          {vis.q34 ? (
            <Row label="Q34 Referral reasons" value={form.q34_referral_reasons} />
          ) : null}
          {vis.q34b ? (
            <Row label="Q34b Specify other reason" value={form.q34b_referral_other} />
          ) : null}
          {vis.q35 ? (
            <Row label="Q35 Facility referred to" value={form.q35_facility_referred_to} />
          ) : null}
        </Section>
      ) : null}

      {vis.section_f ? (
        <Section title="F. Demand generation and contact">
          <Row label="Q36 How heard about service" value={form.q36_how_heard} />
          {vis.q36b ? <Row label="Q36b Specify other" value={form.q36b_how_heard_other} /> : null}
          <Row label="Q37 Has mobile phone" value={form.q37_has_mobile_phone} />
          {vis.q38 ? <Row label="Q38 SMS consent" value={form.q38_sms_consent} /> : null}
          {vis.q39 ? <Row label="Q39 Phone number" value={form.q39_phone_number} /> : null}
          {vis.q40 ? <Row label="Q40 SMS language" value={form.q40_sms_language} /> : null}
          {vis.q40b ? (
            <Row label="Q40b Specify language" value={form.q40b_sms_language_other} />
          ) : null}
          <Row label="Q41 Comments" value={form.q41_comments} />
        </Section>
      ) : null}
    </article>
  )
}
