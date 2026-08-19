import {
  useAuth
} from '../../context/AuthContext'


export default function BaqarahReadCard() {
  const {
    currentUser,
    openAuth
  } =
    useAuth()


  function openReader() {
    if (!currentUser) {
      openAuth('login')
      return
    }

    window.location.hash =
      '#/companion/read'
  }


  return (
    <section className="baqarah-read-card">

      <div className="baqarah-read-card-icon">
        ۞
      </div>


      <div className="baqarah-read-card-copy">
        <span>
          القراءة داخل التطبيق
        </span>

        <h2>
          افتح سورة البقرة
        </h2>

        <p>
          يبدأ المصحف من آخر آية وصلت إليها،
          ويظل موضعك محفوظًا حتى لو أكملت القراءة
          بعد عدة أيام أو أسابيع.
        </p>
      </div>


      <button
        type="button"
        className="baqarah-read-card-button"
        onClick={
          openReader
        }
      >
        متابعة القراءة
      </button>

    </section>
  )
}
