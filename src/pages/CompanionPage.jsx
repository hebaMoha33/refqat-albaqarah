export default function CompanionPage({
  onBack
}) {
  return (
    <main className="companion-page">

      <button
        className="companion-back-button"
        onClick={onBack}
        type="button"
      >
        ← العودة
      </button>


      <section className="companion-empty-page">

        {/* الصفحة متروكة فارغة حاليًا
            وسنضيف محتواها لاحقًا */}

      </section>

    </main>
  )
}