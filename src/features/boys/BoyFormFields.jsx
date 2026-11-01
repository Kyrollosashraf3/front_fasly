import { Checkbox, ChipSelect, Field, Input, Select, Textarea } from '../../components/ui/Field'
import { FATHERS, SKILLS } from '../../lib/constants'

/** Every field of the boy form, bound to `form` through `set`. */
export function BoyFormFields({ form, set, setForm, errors, classes, servants, age, onSubmit }) {
  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      <div className="grid-2">
        <Field label="اسم الولد" required htmlFor="boy-name" error={errors.boy_name}>
          <Input
            id="boy-name"
            placeholder="مثال: مينا فؤاد"
            value={form.boy_name}
            error={errors.boy_name}
            onChange={set('boy_name')}
          />
        </Field>

        <Field label="النوع" required htmlFor="boy-gender" error={errors.gender}>
          <Select id="boy-gender" value={form.gender} error={errors.gender} onChange={set('gender')}>
            <option value="">— اختر —</option>
            <option value="m">ولد</option>
            <option value="f">بنت</option>
          </Select>
        </Field>

        <Field label="تاريخ الميلاد" htmlFor="boy-birth" error={errors.birth_date} hint={age !== null ? `السن: ${age} سنة` : 'اختياري'}>
          <Input
            id="boy-birth"
            type="date"
            value={form.birth_date}
            error={errors.birth_date}
            onChange={set('birth_date')}
          />
        </Field>

        <Field label="الفصل" required htmlFor="boy-class" error={errors.class_id}>
          <Select
            id="boy-class"
            value={form.class_id}
            error={errors.class_id}
            onChange={set('class_id')}
            searchable
            searchPlaceholder="ابحث باسم الفصل..."
          >
            <option value="">— اختر الفصل —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="الخادم"
          htmlFor="boy-servant"
          error={errors.teacher_id}
          hint="الخادم المسئول عن افتقاده"
        >
          <Select
            id="boy-servant"
            value={form.teacher_id}
            onChange={set('teacher_id')}
            searchable
            searchPlaceholder="ابحث باسم الخادم..."
          >
            <option value="">— من غير خادم —</option>
            {(servants || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.teacher_name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="التليفون" htmlFor="boy-phone">
          <Input
            id="boy-phone"
            dir="ltr"
            placeholder="01012345678"
            value={form.phone}
            onChange={set('phone')}
          />
        </Field>

        <Field label="تليفون تاني" htmlFor="boy-phone2">
          <Input
            id="boy-phone2"
            dir="ltr"
            placeholder="01012345678"
            value={form.phone_2}
            onChange={set('phone_2')}
          />
        </Field>

        <Field label="المنطقة" htmlFor="boy-zone">
          <Input id="boy-zone" placeholder="شبرا" value={form.zone} onChange={set('zone')} />
        </Field>

        <Field label="لينك الخريطة" htmlFor="boy-loc">
          <Input
            id="boy-loc"
            dir="ltr"
            placeholder="https://maps.app.goo.gl/..."
            value={form.location}
            onChange={set('location')}
          />
        </Field>

        <Field label="أب الاعتراف" htmlFor="boy-father">
          <Select
            id="boy-father"
            value={form.father_name}
            onChange={set('father_name')}
            searchable
            searchPlaceholder="ابحث باسم أبونا..."
          >
            <option value="">— بدون —</option>
            {FATHERS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="الرقم القومى" htmlFor="boy-national">
          <Input
            id="boy-national"
            dir="ltr"
            inputMode="numeric"
            maxLength={20}
            placeholder="14 رقم"
            value={form.national_id}
            onChange={set('national_id')}
          />
        </Field>

        <Field label="المهارات" htmlFor="boy-skills" hint="اختار واحد أو أكتر؛ لو مش موجودة اختار «أخرى» واكتبها">
          <ChipSelect
            options={SKILLS}
            value={form.skills}
            ariaLabel="مهارات الولد"
            onChange={(v) => setForm((f) => ({ ...f, skills: v }))}
          />
        </Field>

        {(form.skills.includes('أخرى') || form.custom.trim()) && (
          <Field
            label="اكتب المهارة"
            htmlFor="boy-skill-custom"
            hint="ظهرت لأنك اخترت «أخرى» — بتتخزن في نفس عمود المهارات"
          >
            <Input
              id="boy-skill-custom"
              placeholder="مثال: خياطة"
              value={form.custom}
              onChange={set('custom')}
            />
          </Field>
        )}

        <Field label="آخر اعتراف" htmlFor="boy-visit">
          <Input
            id="boy-visit"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={form.last_visit_date}
            onChange={set('last_visit_date')}
          />
        </Field>
      </div>

      <Field label="العنوان بالتفصيل" htmlFor="boy-addr">
        <Input
          id="boy-addr"
          placeholder="12 شارع الترعة، شبرا الخيمة"
          value={form.address}
          onChange={set('address')}
        />
      </Field>

      <Field label="ملاحظات" htmlFor="boy-note">
        <Textarea
          id="boy-note"
          rows={3}
          maxLength={500}
          placeholder="أي معلومة مهمة عن الولد"
          value={form.note}
          onChange={set('note')}
        />
      </Field>

      <Checkbox
        label="محتاج متابعة (يظهر بعلامة حمرا في القوائم)"
        checked={form.issue_flag}
        onChange={set('issue_flag')}
      />
    </form>
  )
}
