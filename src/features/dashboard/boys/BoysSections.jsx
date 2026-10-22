import { Badge } from '../../../components/ui/Badge'
import { Tabs } from '../../../components/ui/Toolbar'
import { formatShort } from '../../../lib/format'
import {
  AbsentNowBadge,
  ClassGroups,
  DashSection,
  FollowedBadge,
  LateBadge,
  NField,
  StreakBadge,
  TodoBadge,
  TrendChart,
} from '../parts'

/** Everything below the KPI row on the boys dashboard. */
export function BoysSections({
  data,
  byClass,
  cover,
  late,
  coverGroups,
  coverTab,
  setCoverTab,
  trendN,
  setTrendN,
  streakN,
  setStreakN,
  absentN,
  setAbsentN,
  openBoy,
  classLabel,
}) {
  return (
    <>
      {!data.scope.single_class && byClass.length > 0 && (
        <DashSection title="نسبة الحضور لكل فصل">
          <div className="card class-bars">
            {byClass.map(([cid, v]) => (
              <div key={cid}>
                <div className="class-bars__row">
                  <strong>{classLabel(Number(cid))}</strong>
                  <span>
                    {v.percent}% حضور · {v.liturgy_percent}% قداس ({v.present}/{v.total})
                  </span>
                </div>
                <div className="progress">
                  <div className="progress__fill" style={{ width: `${v.percent}%` }} />
                </div>
                <div className="progress progress--liturgy">
                  <div className="progress__fill" style={{ width: `${v.liturgy_percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </DashSection>
      )}

      <DashSection
        title="منحنى حضور الأولاد"
        hint="عدد الحاضرين وحضور القداس في كل جمعة (من الأقدم للأحدث)."
        control={
          <NField label="عدد الجمع" value={trendN} onChange={setTrendN} from={1} to={12} />
        }
      >
        <div className="card">
          {data.boys_trend.length ? (
            <TrendChart points={data.boys_trend} />
          ) : (
            <p className="muted small">لا توجد جمعات مسجلة بعد.</p>
          )}
        </div>
      </DashSection>

      <DashSection
        title="افتقاد الأولاد"
        hint={`الأولاد الذين تم افتقادهم خلال الفترة مقابل من لم يُفتقد بعد (من ${formatShort(data.scope.period_start)}).`}
        control={
          <Tabs
            value={coverTab}
            onChange={setCoverTab}
            options={[
              { value: 'todo', label: 'لم يُفتقدوا', count: cover?.todo_count },
              { value: 'done', label: 'افتقدوا', count: cover?.done_count },
            ]}
          />
        }
      >
        <ClassGroups
          groups={coverGroups || {}}
          singleClass={data.scope.single_class}
          emptyTitle={coverTab === 'done' ? 'لا يوجد افتقاد' : 'تم افتقاد الكل'}
          emptyMsg={
            coverTab === 'done'
              ? 'لم يتم افتقاد أي ولد خلال الفترة المختارة.'
              : 'كل الأولاد تم افتقادهم خلال الفترة.'
          }
          badge={(b) =>
            coverTab === 'done' ? <FollowedBadge count={b.count} /> : <TodoBadge />
          }
          onBoy={openBoy}
        />
      </DashSection>

      <DashSection
        title="متأخرون عن الاعتراف"
        hint={
          late?.late_count
            ? `${late.late_count} ولد لم يعترفوا من ${formatShort(data.scope.period_start)}.`
            : 'الكل اعترفوا خلال الفترة المختارة.'
        }
      >
        <ClassGroups
          groups={late?.late || {}}
          singleClass={data.scope.single_class}
          emptyTitle="لا يوجد متأخرون"
          emptyMsg="كل الأولاد اعترفوا خلال الفترة المختارة."
          badge={(b) => <LateBadge days={b.days} />}
          onBoy={openBoy}
        />
      </DashSection>

      <DashSection
        title="المواظبون على الحضور"
        hint={`حاضرون جمعات متواصلة حتى آخر جمعة مسجلة (${data.last_friday.date ? data.last_friday.date : '—'}).`}
        control={
          <NField
            label="عدد الجمع المتواصلة"
            value={streakN}
            onChange={setStreakN}
            from={1}
            to={12}
          />
        }
      >
        <ClassGroups
          groups={data.streaks}
          singleClass={data.scope.single_class}
          emptyTitle="لا يوجد مواظبون"
          emptyMsg={`لا أحد وصل ${streakN} جمعات متواصلة. جرّب رقمًا أصغر.`}
          badge={(b) => <StreakBadge streak={b.streak} />}
          onBoy={openBoy}
        />
      </DashSection>

      <DashSection
        title="غياب آخر جمعة مسجلة"
        hint={
          data.last_friday.date
            ? `${data.last_friday.date} — حاضر ${data.last_friday.present_count} • غائب ${data.last_friday.absent_count}`
            : 'لم يتم تسجيل أي حضور حتى الآن.'
        }
      >
        {data.last_friday.date ? (
          <ClassGroups
            groups={data.last_friday.by_class}
            singleClass={data.scope.single_class}
            emptyTitle="لا يوجد غياب"
            emptyMsg="الكل كان حاضرًا في آخر جمعة مسجلة."
            badge={() => <AbsentNowBadge />}
            onBoy={openBoy}
          />
        ) : (
          <p className="muted small">لا يوجد تسجيل بعد.</p>
        )}
      </DashSection>

      <DashSection
        title="الغياب المتكرر"
        hint="الأولاد الذين غابوا أكثر من العدد المحدد من الجمع."
        control={
          <NField
            label="أكثر من كام جمعة غياب"
            value={absentN}
            onChange={setAbsentN}
            from={0}
            to={12}
          />
        }
      >
        <ClassGroups
          groups={data.frequent_absent}
          singleClass={data.scope.single_class}
          emptyTitle="لا يوجد غياب متكرر"
          emptyMsg={`لا أحد غاب أكثر من ${absentN} جمعات.`}
          badge={(b) => <Badge kind="red">غياب {b.absent_count}</Badge>}
          onBoy={openBoy}
        />
      </DashSection>
    </>
  )
}
