import { ChipSelect, Field, Input, Select, Textarea } from '../../components/ui/Field'
import { FATHERS, SKILLS } from '../../lib/constants'

/** The servant form body. */
export function TeacherFormFields({ form, errors, set, classes, setForm, canSkipClass, onSubmit }) {
  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      <Field label="اسم الخادم" required htmlFor="t-name" error={errors.teacher_name}>
        <Input
          id="t-name"
          placeholder="مثال: أ. مينا عادل"
          value={form.teacher_name}
          error={errors.teacher_name}
          onChange={set('teacher_name')}
        />
      </Field>

      <div className="grid-2">
        <Field label="التليفون" htmlFor="t-phone">
          <Input id="t-phone" dir="ltr" placeholder="01012345678" value={form.phone} onChange={set('phone')} />
        </Field>

        <Field label="التليفون الثانى" htmlFor="t-phone2">
          <Input id="t-phone2" dir="ltr" placeholder="01012345678" value={form.phone_2} onChange={set('phone_2')} />
        </Field>

        <Field
          label="الفصل"
          required={!canSkipClass}
          htmlFor="t-class"
          error={errors.class_id}
        >
          <Select
            id="t-class"
            value={form.class_id}
            onChange={set('class_id')}
            searchable
            searchPlaceholder="ابحث باسم الفصل..."
          >
            {canSkipClass ? (
              <option value="">بدون فصل (خادم عام / أمين مرحلة)</option>
            ) : (
              <option value="">— اختر الفصل —</option>
            )}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="المنطقة/الشارع" htmlFor="t-zone">
          <Input id="t-zone" placeholder="مثال: مصر الجديدة" value={form.zone} onChange={set('zone')} />
        </Field>

        <Field label="أب الاعتراف" htmlFor="t-father">
          <Select
            id="t-father"
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

        <Field label="المهارات" htmlFor="t-skills" hint="اختار واحد أو أكتر؛ لو مش موجودة اختار «أخرى» واكتبها">
          <ChipSelect
            options={SKILLS}
            value={form.skills}
            ariaLabel="مهارات الخادم"
            onChange={(v) => setForm((f) => ({ ...f, skills: v }))}
          />
        </Field>

        {(form.skills.includes('أخرى') || form.custom.trim()) && (
          <Field
            label="اكتب المهارة"
            htmlFor="t-skill-custom"
            hint="ظهرت لأنك اخترت «أخرى» — بتتخزن في نفس عمود المهارات"
          >
            <Input
              id="t-skill-custom"
              placeholder="مثال: خياطة"
              value={form.custom}
              onChange={set('custom')}
            />
          </Field>
        )}

        <Field label="تاريخ الميلاد" htmlFor="t-birth" hint="لسه بيستخدم في موديول أعياد الميلاد">
          <Input
            id="t-birth"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={form.birth_date}
            onChange={set('birth_date')}
          />
        </Field>

        <Field label="آخر اعتراف" htmlFor="t-visit">
          <Input
            id="t-visit"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={form.last_visit_date}
            onChange={set('last_visit_date')}
          />
        </Field>

        <Field label="رابط الموقع الجغرافى" htmlFor="t-loc">
          <Input
            id="t-loc"
            dir="ltr"
            placeholder="https://maps.app.goo.gl/..."
            value={form.location}
            onChange={set('location')}
          />
        </Field>
      </div>

      <Field label="عنوان المنزل بالتفصيل" htmlFor="t-address">
        <Textarea
          id="t-address"
          rows={2}
          placeholder="العنوان بالتفصيل"
          value={form.address}
          onChange={set('address')}
        />
      </Field>

      <Field label="ملاحظات" htmlFor="t-note">
        <Textarea
          id="t-note"
          rows={3}
          maxLength={500}
          placeholder="دور الخادم، ملاحظات عنه..."
          value={form.note}
          onChange={set('note')}
        />
      </Field>

      <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
    </form>
  )
}
