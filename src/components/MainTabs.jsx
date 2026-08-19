const tabs = [
  ['today', 'اليوم'],
  ['progress', 'تقدمي'],
  ['community', 'الرفقة'],
  ['ranking', 'الترتيب']
]

export default function MainTabs({
  activeTab,
  currentUser,
  onChange,
  onNeedAuth
}) {
  function handleTab(tab) {
    if (
      tab !== 'today' &&
      !currentUser
    ) {
      onNeedAuth?.()
      return
    }

    onChange(tab)
  }

  return (
    <nav className="main-tabs">
      {tabs.map(([value, label]) => (
        <button
          key={value}
          className={
            activeTab === value
              ? 'active'
              : ''
          }
          onClick={() => handleTab(value)}
        >
          {label}
          {!currentUser && value !== 'today' && (
            <small className="tab-lock">•</small>
          )}
        </button>
      ))}
    </nav>
  )
}
