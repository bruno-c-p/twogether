import { couple, hero, split } from "@/features/landing/content";
import { SeamLink } from "@/features/landing/components/seam-link/seam-link";
import styles from "@/features/landing/components/split-stage/split-stage.module.css";

// The signature: the grocery total tears along the seam into two halves and
// the cent that does not divide rolls to the payer. The scroll position
// drives it in CSS; the static markup is the torn end state, so reduced
// motion and browsers without scroll timelines get a finished composition.
export function SplitStage() {
  return (
    <section className={styles.track} aria-labelledby="landing-title">
      <div className={styles.stage}>
        <div className={styles.head}>
          <h1 id="landing-title" className={styles.title}>
            {hero.title}
          </h1>
          <div className={styles.lede}>
            <p className={styles.intro}>{hero.intro}</p>
            <SeamLink to="/entrar">{hero.cta}</SeamLink>
          </div>
        </div>

        <figure className={styles.figure}>
          <p className="sr-only">{hero.summary}</p>
          <div className={styles.amount} aria-hidden="true">
            <span className={styles.receipt}>{split.label}</span>
            <span className={`${styles.receipt} ${styles.receiptSplit}`}>
              Dividido com {couple.partner}
            </span>
            <span className={styles.seam} />
            <span className={`${styles.piece} ${styles.pieceLeft}`}>
              <Total />
            </span>
            <span className={`${styles.piece} ${styles.pieceRight}`}>
              <Total />
            </span>
            <span className={`${styles.half} ${styles.halfLeft}`}>
              <span className={styles.currency}>R$</span>
              {split.half}
            </span>
            <span className={`${styles.half} ${styles.halfRight}`}>
              <span className={styles.currency}>R$</span>
              {split.half}
            </span>
            <span className={styles.coinTrack}>
              <span className={`${styles.coin} ${styles.coinRocking}`}>
                <span className={styles.coinValue}>+{split.odd}</span>
              </span>
              <span className={`${styles.coin} ${styles.coinStill}`}>
                <span className={styles.coinValue}>+{split.odd}</span>
              </span>
            </span>
          </div>
          <figcaption className={styles.caption}>
            <span className={`${styles.person} ${styles.personPayer}`}>
              <span className={styles.avatar} aria-hidden="true">
                {couple.payer[0]}
              </span>
              {couple.payer} pagou
            </span>
            <span className={styles.rule}>{hero.rule}</span>
            <span className={`${styles.person} ${styles.personPartner}`}>
              {couple.partner} deve
              <span className={styles.avatar} aria-hidden="true">
                {couple.partner[0]}
              </span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Total() {
  return (
    <>
      <span className={styles.currency}>R$</span>
      {split.total}
    </>
  );
}
