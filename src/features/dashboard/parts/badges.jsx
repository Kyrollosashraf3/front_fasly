import { Badge } from '../../../components/ui/Badge'

export const StreakBadge = ({ streak }) => <span className="score-pill">{streak} جمعة</span>
export const AbsentBadge = ({ count }) => <Badge kind="red">غياب {count}</Badge>
export const AbsentNowBadge = () => <Badge kind="red">غائب</Badge>
export const LiturgyBadge = ({ percent }) => (
  <Badge kind="gold">{percent}% قداس</Badge>
)
export const FollowedBadge = ({ count }) => <Badge kind="green">اتفتقد {count}</Badge>
export const TodoBadge = () => <Badge kind="red">لم يُفتقد</Badge>
export const LateBadge = ({ days }) => (
  <Badge kind="red">{days == null ? 'مفيش اعتراف' : `متأخر ${days} يوم`}</Badge>
)
