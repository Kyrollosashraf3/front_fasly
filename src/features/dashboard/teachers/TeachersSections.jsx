import { Tabs } from '../../../components/ui/Toolbar'
import { Table } from '../../../components/ui/Table'
import { EmptyState } from '../../../components/ui/States'
import { ScorePill } from '../../../components/ui/Bits'
import { formatShort } from '../../../lib/format'
import {
  DashSection,
  FollowedBadge,
  LateBadge,
  NField,
  ServantGroups,
  TodoBadge,
  TrendChart,
} from '../parts'

/** Charts, rankings, coverage and the servants table. */
export function TeachersSections({
  data,
  cover,
  late,
  coverGroups,
  coverTab,
  setCoverTab,
  trendN,
  setTrendN,
  topN,
  setTopN,
  classLabel,
}) {
  const columns = [
    { key: 'teacher_name', label: 'الخادم', mobile: 'الخادم', render: (s) => <span className="table__name">{s.teacher_name}</span> },
    { key: 'class_id', label: 'الفصل', width: 150, mobile: 'الفصل', render: (s) => classLabel(s.class_id) },
    { key: 'score', label: 'النقاط', width: 90, mobile: 'النقاط', render: (s) => <ScorePill value={s.score} suffix="" /> },
    { key: 'attend', label: 'حاضر', width: 70, align: 'center', mobile: 'حاضر' },
    { key: 'prepare', label: 'تحضير الدرس', width: 90, align: 'center', mobile: 'تحضير الدرس' },
    { key: 'liturgy', label: 'القداس', width: 70, align: 'center', mobile: 'القداس' },
    { key: 'follow', label: 'افتقاد', width: 70, align: 'center', mobile: 'افتقاد' },
    { key: 'teachers_meeting', label: 'اجتماع الخدام', width: 100, align: 'center', mobile: 'اجتماع الخدام' },
  ]

  return (
    <>
      <DashSection
        title="منحنى حضور الخدام"
        hint="عدد الخدام الحاضرين في كل جمعة (من الأقدم للأحدث)."
        control={
          <NField label="عدد الجمع" value={trendN} onChange={setTrendN} from={1} to={12} />
        }
      >
        <div className="card">
          {data.teachers_trend.length ? (
            <TrendChart points={data.teachers_trend} unit="حاضر" />
          ) : (
            <p className="muted small">لا توجد متابعات مسجلة بعد.</p>
          )}
        </div>
      </DashSection>

      <DashSection
        title="أفضل الخدام"
        hint="النقاط = مجموع (الحضور + تحضير الدرس + القداس + الافتقاد + اجتماع الخدام) في كل المتابعات. المتساوتون مع الأخير يدخلون معه."
        control={<NField label="عدد الأوائل" value={topN} onChange={setTopN} from={1} to={12} />}
      >
        {data.top_servants.length === 0 ? (
          <EmptyState
            icon="servant"
            title="لا توجد متابعات بعد"
            message="سجّل متابعة الخدام أولًا لتظهر هنا."
            inline
          />
        ) : (
          <div className="name-list">
            {data.top_servants.map((s, i) => (
              <div className="name-list__item" key={s.teacher_id}>
                <span className="name-list__main">
                  <span className={`dash-rank dash-rank--${Math.min(i + 1, 3)}`}>{i + 1}</span>
                  <strong>{s.teacher_name}</strong>
                  <span className="muted small">• {classLabel(s.class_id)}</span>
                </span>
                <span className="score-pill">{s.score} نقطة</span>
              </div>
            ))}
          </div>
        )}
      </DashSection>

      <DashSection
        title="افتقاد الخدام"
        hint={`الخدام الذين سجّلوا افتقادًا خلال الفترة مقابل من لم يسجّل بعد (من ${formatShort(data.scope.period_start)}).`}
        control={
          <Tabs
            value={coverTab}
            onChange={setCoverTab}
            options={[
              { value: 'todo', label: 'لم يفتقدوا', count: cover?.todo_count },
              { value: 'done', label: 'افتقدوا', count: cover?.done_count },
            ]}
          />
        }
      >
        <ServantGroups
          groups={coverGroups || {}}
          singleClass={data.scope.single_class}
          emptyTitle={coverTab === 'done' ? 'لا يوجد افتقاد' : 'افتقد الكل'}
          emptyMsg={
            coverTab === 'done'
              ? 'لم يسجّل أي خادم افتقادًا خلال الفترة.'
              : 'كل الخدام سجّلوا افتقادًا خلال الفترة.'
          }
          badge={(s) =>
            coverTab === 'done' ? <FollowedBadge count={s.count} /> : <TodoBadge />
          }
        />
      </DashSection>

      <DashSection
        title="متأخرون عن الاعتراف"
        hint={
          late?.late_count
            ? `${late.late_count} خادم لم يعترفوا من ${formatShort(data.scope.period_start)}.`
            : 'الكل اعترفوا خلال الفترة المختارة.'
        }
      >
        <ServantGroups
          groups={late?.late || {}}
          singleClass={data.scope.single_class}
          emptyTitle="لا يوجد متأخرون"
          emptyMsg="كل الخدام اعترفوا خلال الفترة المختارة."
          badge={(s) => <LateBadge days={s.days} />}
        />
      </DashSection>

      {data.servants.length > 0 && (
        <DashSection
          title="أداء الخدام"
          hint="مجموع علامات ✓ التي جمعها كل خادم في كل المتابعات المسجلة."
        >
          <Table columns={columns} rows={data.servants} rowKey={(s) => s.teacher_id} compact stackOnMobile />
        </DashSection>
      )}
    </>
  )
}
