export const FLAGS = [
  { key: 'attend', label: 'حاضر', short: 'حضور' },
  { key: 'prepare', label: 'تحضير الدرس', short: 'تحضير' },
  { key: 'liturgy', label: 'القداس', short: 'قداس' },
  { key: 'follow', label: 'افتقاد', short: 'افتقاد' },
  { key: 'teachers_meeting', label: 'اجتماع الخدام', short: 'اجتماع' },
]

export const EMPTY_MARK = {
  attend: false,
  prepare: false,
  liturgy: false,
  follow: false,
  teachers_meeting: false,
  note: '',
}
