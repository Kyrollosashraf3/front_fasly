import { Link } from 'react-router-dom'

/**
 * PageHead — breadcrumb + title + subtitle, with actions on the trailing side.
 *
 *   <PageHead title="الحضور" sub="جمعة 2 أكتوبر" crumb={[{label:'الفصول', to:'/'}]}
 *             actions={<Button .../>} />
 */
export function PageHead({ title, sub, crumb, actions }) {
  return (
    <div className="page-head">
      <div>
        {crumb?.length > 0 && (
          <nav className="page-head__crumb" aria-label="مسار التنقل">
            {crumb.map((item, i) => (
              <span key={item.to || item.label} className="row" style={{ gap: 6 }}>
                {i > 0 && <span aria-hidden="true">/</span>}
                {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="page-head__title">{title}</h1>
        {sub && <div className="page-head__sub">{sub}</div>}
      </div>
      {actions && <div className="toolbar__group">{actions}</div>}
    </div>
  )
}
