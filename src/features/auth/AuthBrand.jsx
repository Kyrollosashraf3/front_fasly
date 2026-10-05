import { Icon } from '../../components/ui/Icon'

/**
 * AuthBrand — the navy panel shared by the login and signup screens.
 */
export function AuthBrand() {
  return (
    <aside className="login__brand">
      <div className="login__mark">ف</div>
      <h1 className="login__wordmark">فصلي</h1>
      <div className="login__rule" />
      <p className="login__tagline">
        نظام إدارة مدارس الأحد — الحضور، الافتقاد، ومتابعة الخدام في مكان واحد.
      </p>

      <ul className="login__points">
        <li>
          <Icon name="calendar" size={17} /> حضور الجمعة بضغطة واحدة
        </li>
        <li>
          <Icon name="heart" size={17} /> سجل افتقاد أسبوعي لكل خادم
        </li>
        <li>
          <Icon name="chart" size={17} /> لوحة متابعة الأداء والغياب المتكرر
        </li>
      </ul>
    </aside>
  )
}
